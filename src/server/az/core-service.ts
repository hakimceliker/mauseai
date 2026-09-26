import { runCore, type CoreDeps } from "@/src/lib/core/orchestrator";
import type { RetrievableChunk } from "@/src/lib/core/retrieval";
import type { MemoryMessage } from "@/src/lib/core/prompt-policy";
import { expandQuery, type GlossaryTerm } from "@/src/lib/knowledge/knowledge";
import { classifyText } from "@/src/lib/compliance/compliance";
import { explainResult } from "@/src/lib/ux/experience";
import type { Role } from "@/src/lib/isolation/guard";
import { audit, check, notify, openIncident, requestApproval, type Db } from "./records";

/**
 * CORE as a service: loads the tenant's context (chunks the caller may see,
 * glossary, conversation memory, budget), runs the pipeline and records its
 * evidence — model call, cost, audit, approval or incident.
 */

export interface AskInput {
  tenantId: string;
  userId: string;
  role: Role;
  question: string;
  riskLevel: "L1" | "L2" | "L3" | "L4";
  channel: string;
}

export async function loadVisibleChunks(db: Db, tenantId: string, userId: string): Promise<RetrievableChunk[]> {
  const rows = check(
    await db
      .from("document_chunks")
      .select("id,document_id,content,tenant_id,visibility,created_by")
      .eq("tenant_id", tenantId)
      .limit(5000),
    "chunks_load_failed",
  ) as Array<{ id: string; document_id: string; content: string; tenant_id: string; visibility: string; created_by: string | null }>;
  // RLS already hides other users' personal chunks; this filter keeps the rule explicit in code too.
  return rows
    .filter((r) => r.visibility === "team" || r.created_by === userId)
    .map((r) => ({ id: r.id, documentId: r.document_id, content: r.content, tenantId: r.tenant_id }));
}

export async function loadGlossary(db: Db, tenantId: string): Promise<GlossaryTerm[]> {
  const rows = check(await db.from("glossary_terms").select("term,definition,synonyms").eq("tenant_id", tenantId), "glossary_load_failed") as GlossaryTerm[];
  return rows;
}

export async function monthlyBudget(db: Db, tenantId: string, now = new Date()): Promise<{ spentCents: number; limitCents: number | null }> {
  const tenant = await db.from("tenants").select("monthly_limit").eq("id", tenantId).maybeSingle();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const costs = check(await db.from("cost_events").select("cost_cents").eq("tenant_id", tenantId).gte("created_at", monthStart), "cost_load_failed") as Array<{ cost_cents: number }>;
  const spentCents = costs.reduce((s, c) => s + Number(c.cost_cents), 0);
  const limit = tenant.data?.monthly_limit;
  return { spentCents, limitCents: limit === null || limit === undefined ? null : Math.round(Number(limit) * 100) };
}

export async function ask(db: Db, admin: Db, input: AskInput, deps: CoreDeps = {}) {
  const contextKey = `${input.tenantId}:${input.userId}`;
  const [chunks, glossary, budget, history] = await Promise.all([
    loadVisibleChunks(db, input.tenantId, input.userId),
    loadGlossary(db, input.tenantId),
    monthlyBudget(db, input.tenantId),
    db
      .from("channel_messages")
      .select("direction,text")
      .eq("tenant_id", input.tenantId)
      .eq("context_key", contextKey)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const memory: MemoryMessage[] = ((history.data ?? []) as Array<{ direction: string; text: string }>)
    .reverse()
    .map((m) => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.text }));

  const result = await runCore(
    {
      ctx: { tenantId: input.tenantId, userId: input.userId, role: input.role },
      question: expandQuery(input.question, glossary),
      riskLevel: input.riskLevel,
      history: memory,
      chunks,
      budget,
    },
    deps,
  );
  const explanation = explainResult(result);

  // One context for every channel (card O): inbound question and outbound answer.
  await db.from("channel_messages").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    channel: input.channel,
    context_key: contextKey,
    direction: "inbound",
    text: input.question,
    data_class: classifyText(input.question, "personal"),
  });

  let approvalId: string | null = null;
  let incidentId: string | null = null;
  if (result.status === "blocked") {
    if (result.incident) incidentId = (await openIncident(db, { tenantId: input.tenantId, incident: result.incident, source: "core.ask", createdBy: input.userId })).id;
  } else if (result.status !== "denied") {
    const call = check(
      await db
        .from("model_calls")
        .insert({
          tenant_id: input.tenantId,
          user_id: input.userId,
          origin: "core",
          provider: result.usage.provider,
          mock: result.usage.mock,
          ok: true,
          latency_ms: result.usage.latencyMs,
          tokens: result.usage.estimatedTokens,
          cost_cents: result.usage.costCents,
          fallback_used: result.usage.fallbackUsed,
          outcome: result.status,
          question: input.question.slice(0, 2000),
        })
        .select("id")
        .single(),
      "model_call_record_failed",
    ) as { id: string };
    const cost = await admin.from("cost_events").insert({
      tenant_id: input.tenantId,
      provider: result.usage.provider,
      cost_cents: result.usage.costCents,
      input_tokens: result.usage.estimatedTokens,
      output_tokens: 0,
    });
    if (cost.error) throw new Error("cost_record_failed");
    await db.from("channel_messages").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      channel: input.channel,
      context_key: contextKey,
      direction: "outbound",
      text: result.quality.answer.answer,
      data_class: "internal",
    });
    if (result.status === "escalated") {
      approvalId = (
        await requestApproval(db, {
          tenantId: input.tenantId,
          resourceType: "answer",
          resourceId: call.id,
          area: "output_quality",
          priority: input.riskLevel === "L4" ? "high" : "normal",
          reason: `Yanıt insan incelemesi gerektiriyor: ${result.quality.reasons.join(", ")}`,
          requestedBy: input.userId,
        })
      ).id;
    }
    await audit(admin, {
      tenantId: input.tenantId,
      actorType: "user",
      actorId: input.userId,
      action: "core.answered",
      resourceType: "model_call",
      resourceId: call.id,
      costCents: result.usage.costCents,
      riskLevel: input.riskLevel,
      payload: { status: result.status, provider: result.usage.provider, mock: result.usage.mock, citations: result.quality.answer.citations.length },
    });
    return { answerId: call.id, approvalId, incidentId, explanation };
  }

  await audit(admin, {
    tenantId: input.tenantId,
    actorType: "user",
    actorId: input.userId,
    action: result.status === "blocked" ? "core.blocked" : "core.denied",
    resourceType: "core",
    riskLevel: input.riskLevel,
    payload: result.status === "denied" ? { reason: result.guard.reason } : { incidentId },
  });
  if (result.status === "denied" && result.guard.reason === "budget_exceeded")
    await notify(db, { tenantId: input.tenantId, kind: "alert", area: "sre_cost", priority: "high", title: "Aylık bütçe aşıldı", body: "CORE isteği bütçe nedeniyle reddedildi." });
  return { answerId: null, approvalId, incidentId, explanation, deniedReason: result.status === "denied" ? result.guard.reason : null };
}
