import { createHash } from "node:crypto";
import { isSchemaCompatible, payloadToText, type IngestPayload } from "@/src/lib/ingestion/ingestion";
import { prepareDocument } from "@/src/lib/preparation/prepare";
import { labelFeedback, type FeedbackInput } from "@/src/lib/feedback/feedback";
import { goldenCaseFromFeedback } from "@/src/lib/growth/growth";
import { escalation, overdueApprovals, type PendingApproval } from "@/src/lib/notifications/notifications";
import { anonymizationPlan, DATA_INVENTORY, RETENTION_DAYS, transitionDeletion, type DeletionStatus } from "@/src/lib/compliance/compliance";
import type { Area } from "@/src/lib/ownership/ownership";
import { audit, check, notify, ServiceError, type Db } from "./records";

/**
 * Background pipelines behind the diagram's arrows:
 *   G → H (ingest → prepare), F → Q/Z (feedback → golden set), N → T (SLA escalation),
 *   O → U (retention and anonymisation).
 */

/* ---------------- G: receive ---------------- */

export async function receiveDocument(
  db: Db,
  input: { tenantId: string; createdBy: string | null; payload: IngestPayload; visibility?: "personal" | "team" },
) {
  const source = check(
    await db.from("ingestion_sources").select("id,schema_version,active,tenant_id").eq("id", input.payload.sourceId).eq("tenant_id", input.tenantId).maybeSingle(),
    "ingestion_source",
  ) as { id: string; schema_version: string; active: boolean };
  if (!source.active) throw new ServiceError("ingestion_source_inactive", 409);
  if (!isSchemaCompatible(source.schema_version, input.payload.schemaVersion)) throw new ServiceError("schema_version_incompatible", 422);

  const text = payloadToText(input.payload);
  const contentHash = createHash("sha256").update(text).digest("hex");
  const existing = await db
    .from("documents")
    .select("id,status")
    .eq("tenant_id", input.tenantId)
    .eq("source_id", source.id)
    .eq("external_id", input.payload.externalId)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existing.data) return { document: existing.data as { id: string; status: string }, duplicate: true };

  const document = check(
    await db
      .from("documents")
      .insert({
        tenant_id: input.tenantId,
        source_id: source.id,
        external_id: input.payload.externalId,
        title: input.payload.title,
        content_type: input.payload.contentType,
        schema_version: input.payload.schemaVersion,
        content_hash: contentHash,
        raw_content: text,
        metadata: input.payload.metadata,
        visibility: input.visibility ?? "team",
        created_by: input.createdBy,
      })
      .select("id,status")
      .single(),
    "document_create_failed",
  ) as { id: string; status: string };
  return { document, duplicate: false };
}

/* ---------------- H: prepare (runs in Inngest with the service client) ---------------- */

export async function prepareStoredDocument(admin: Db, tenantId: string, documentId: string) {
  const doc = check(
    await admin.from("documents").select("*").eq("id", documentId).eq("tenant_id", tenantId).maybeSingle(),
    "document",
  ) as { id: string; source_id: string; schema_version: string; raw_content: string; status: string; visibility: string; created_by: string | null; metadata: Record<string, unknown>; title: string };
  if (doc.status !== "received") return { status: doc.status, chunks: 0, skipped: true };

  const result = prepareDocument({
    documentId: doc.id,
    sourceId: doc.source_id,
    schemaVersion: doc.schema_version,
    content: doc.raw_content,
    metadata: { ...doc.metadata, title: doc.title },
  });
  if (result.chunks.length) {
    // Retry-safe: chunks already written by an earlier attempt are skipped by (document_id, chunk_index).
    const written = check(await admin.from("document_chunks").select("chunk_index").eq("document_id", doc.id), "chunks_read_failed") as Array<{ chunk_index: number }>;
    const done = new Set(written.map((w) => w.chunk_index));
    const pending = result.chunks.filter((c) => !done.has(c.index));
    if (pending.length) {
      const insert = await admin.from("document_chunks").insert(
        pending.map((c) => ({
          tenant_id: tenantId,
          document_id: doc.id,
          chunk_index: c.index,
          content: c.content,
          token_estimate: c.tokenEstimate,
          lineage_hash: c.lineageHash,
          metadata: c.metadata,
          visibility: doc.visibility,
          created_by: doc.created_by,
        })),
      );
      if (insert.error) throw new ServiceError("chunks_write_failed");
    }
  }
  const update = await admin
    .from("documents")
    .update({ status: result.status, quality_gates: result.gates, pii_found: result.piiFound, prepared_at: new Date().toISOString() })
    .eq("id", doc.id)
    .eq("tenant_id", tenantId);
  if (update.error) throw new ServiceError("document_update_failed");
  await audit(admin, {
    tenantId,
    actorType: "worker",
    actorId: "inngest",
    action: result.status === "ready" ? "document.prepared" : "document.rejected",
    resourceType: "document",
    resourceId: doc.id,
    payload: { chunks: result.chunks.length, piiFound: result.piiFound, failedGates: result.gates.filter((g) => !g.passed).map((g) => g.gate) },
  });
  return { status: result.status, chunks: result.chunks.length, skipped: false };
}

/* ---------------- F: feedback ---------------- */

export async function submitFeedback(db: Db, input: { tenantId: string; userId: string; feedback: FeedbackInput }) {
  const labelled = labelFeedback(input.feedback);
  let question: string | null = null;
  if (labelled.targetType === "answer") {
    const call = await db.from("model_calls").select("question").eq("id", labelled.targetId).eq("tenant_id", input.tenantId).maybeSingle();
    question = (call.data as { question: string | null } | null)?.question ?? null;
  }
  return check(
    await db
      .from("feedback")
      .insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        target_type: labelled.targetType,
        target_id: labelled.targetId,
        rating: labelled.rating,
        label: labelled.label,
        label_source: labelled.labelSource,
        comment: labelled.comment,
        question,
        queue_status: labelled.queue.enqueue ? "new" : "none",
        queue_priority: labelled.queue.priority,
        queue_reason: labelled.queue.reason,
      })
      .select("*")
      .single(),
    "feedback_create_failed",
  ) as { id: string; label: string; queue_status: string; queue_priority: string | null };
}

/** F → Z → Q: unsafe feedback alerts security; incorrect answers become golden-set candidates. */
export async function processFeedback(admin: Db, tenantId: string, feedbackId: string) {
  const fb = check(await admin.from("feedback").select("*").eq("id", feedbackId).eq("tenant_id", tenantId).maybeSingle(), "feedback") as {
    id: string;
    label: string;
    question: string | null;
    comment: string | null;
    queue_status: string;
    queue_priority: string | null;
  };
  const actions: string[] = [];
  if (fb.label === "unsafe") {
    await notify(admin, { tenantId, kind: "alert", area: "security", priority: "urgent", title: "Güvensiz yanıt bildirimi", body: fb.comment ?? "Yorum yok" });
    actions.push("security_alerted");
  }
  const candidate = goldenCaseFromFeedback(fb);
  if (candidate) {
    const exists = await admin.from("eval_cases").select("id").eq("tenant_id", tenantId).eq("key", candidate.key).maybeSingle();
    if (!exists.data) {
      const insert = await admin.from("eval_cases").insert({ tenant_id: tenantId, key: candidate.key, input: candidate.input, expected: candidate.expected, origin: "feedback" });
      if (insert.error) throw new ServiceError("eval_case_create_failed");
    }
    actions.push("golden_case_candidate");
  }
  if (fb.queue_status === "new") {
    await admin.from("feedback").update({ queue_status: "triaged" }).eq("id", fb.id).eq("tenant_id", tenantId);
    actions.push("triaged");
  }
  await audit(admin, { tenantId, actorType: "worker", actorId: "inngest", action: "feedback.processed", resourceType: "feedback", resourceId: fb.id, payload: { actions } });
  return { actions };
}

/* ---------------- N → T: SLA sweep ---------------- */

export async function sweepApprovalSla(admin: Db, now = new Date()) {
  const rows = check(
    await admin.from("approvals").select("id,tenant_id,area,priority,due_at,escalated_at").eq("status", "pending").is("escalated_at", null).lt("due_at", now.toISOString()),
    "approvals_load_failed",
  ) as Array<PendingApproval & { tenant_id: string; due_at: string }>;
  const overdue = overdueApprovals(rows.map((r) => ({ ...r, dueAt: r.due_at })), now);
  for (const approval of overdue) {
    const tenantId = (approval as unknown as { tenant_id: string }).tenant_id;
    const draft = escalation(approval, now);
    await notify(admin, { tenantId, kind: "sla", area: approval.area as Area, priority: draft.priority, title: draft.title, body: draft.body });
    await admin.from("approvals").update({ escalated_at: now.toISOString() }).eq("id", approval.id).eq("tenant_id", tenantId);
  }
  return { escalated: overdue.length };
}

/* ---------------- O → U: retention and erasure ---------------- */

/** Dry-run: counts rows past retention per table; nothing is removed. */
export async function retentionReport(admin: Db, now = new Date()) {
  const report: Array<{ table: string; dataClass: string; retentionDays: number | null; due: number }> = [];
  for (const entry of DATA_INVENTORY) {
    const days = RETENTION_DAYS[entry.dataClass];
    if (days === null) continue;
    const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
    const rows = await admin.from(entry.table).select("id").lt("created_at", cutoff).limit(10_000);
    report.push({ table: entry.table, dataClass: entry.dataClass, retentionDays: days, due: rows.error ? -1 : (rows.data ?? []).length });
  }
  return report;
}

export async function decideDeletion(db: Db, input: { tenantId: string; requestId: string; decidedBy: string; decision: "approved" | "rejected" }) {
  const request = check(
    await db.from("deletion_requests").select("*").eq("id", input.requestId).eq("tenant_id", input.tenantId).maybeSingle(),
    "deletion_request",
  ) as { id: string; status: DeletionStatus; scope: string[] };
  const next = transitionDeletion(request.status, input.decision);
  return check(
    await db
      .from("deletion_requests")
      .update({ status: next, decided_by: input.decidedBy, decided_at: new Date().toISOString(), plan: anonymizationPlan(request.scope) })
      .eq("id", request.id)
      .eq("tenant_id", input.tenantId)
      .select("*")
      .single(),
    "deletion_request_update_failed",
  ) as { id: string; status: DeletionStatus };
}

/** Executes an approved request as anonymisation (UPDATE, never DELETE) and marks it completed. */
export async function executeDeletion(admin: Db, tenantId: string, requestId: string) {
  const request = check(
    await admin.from("deletion_requests").select("*").eq("id", requestId).eq("tenant_id", tenantId).maybeSingle(),
    "deletion_request",
  ) as { id: string; status: DeletionStatus; subject_user_id: string; plan: Array<{ table: string; column: string; subjectColumn: string; replacement: string }> };
  if (request.status === "completed") return { anonymized: 0, alreadyCompleted: true };
  transitionDeletion(request.status, "completed");
  let anonymized = 0;
  for (const step of request.plan) {
    const result = await admin
      .from(step.table)
      .update({ [step.column]: step.replacement })
      .eq("tenant_id", tenantId)
      .eq(step.subjectColumn, request.subject_user_id)
      .select("id");
    if (result.error) throw new ServiceError("anonymization_failed");
    anonymized += (result.data ?? []).length;
  }
  await admin.from("deletion_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", request.id).eq("tenant_id", tenantId);
  await audit(admin, { tenantId, actorType: "worker", actorId: "inngest", action: "compliance.anonymized", resourceType: "deletion_request", resourceId: request.id, payload: { anonymized } });
  return { anonymized, alreadyCompleted: false };
}
