import { advanceFlow, applyApproval, BUILTIN_TEMPLATES, FlowTemplateSchema, type FlowRunState, type FlowRunStatus, type FlowTemplate } from "@/src/lib/flows/flows";
import { ToolRegistry, type ToolAuditRecord } from "@/src/lib/core/tools";
import { runCore, type CoreDeps } from "@/src/lib/core/orchestrator";
import { explainResult } from "@/src/lib/ux/experience";
import { isRole, type Role } from "@/src/lib/isolation/guard";
import { audit, check, notify, requestApproval, ServiceError, type Db } from "./records";
import { loadVisibleChunks, monthlyBudget } from "./core-service";

/**
 * Modular flow runs (card M) wired end to end: CORE executes the steps,
 * approvals pause the run (N), every tool call is audited (L) and every
 * model call is written to model_calls for SLO/cost (edge M→S).
 */

export async function findTemplate(db: Db, tenantId: string, key: string, version?: string): Promise<FlowTemplate> {
  const builtin = BUILTIN_TEMPLATES.find((t) => t.key === key && (!version || t.version === version));
  if (builtin) return builtin;
  let query = db.from("flow_templates").select("key,name,version,steps").eq("tenant_id", tenantId).eq("key", key);
  if (version) query = query.eq("version", version);
  const rows = check(await query.order("created_at", { ascending: false }).limit(1), "flow_template_load_failed") as FlowTemplate[];
  if (!rows.length) throw new ServiceError("flow_template_not_found", 404);
  return FlowTemplateSchema.parse(rows[0]);
}

export async function startRun(db: Db, input: { tenantId: string; userId: string; templateKey: string; goal: string; idempotencyKey: string | null }) {
  if (input.idempotencyKey) {
    const existing = await db.from("flow_runs").select("*").eq("tenant_id", input.tenantId).eq("idempotency_key", input.idempotencyKey).maybeSingle();
    if (existing.data) {
      const row = existing.data as { goal: string; template_key: string };
      if (row.goal !== input.goal || row.template_key !== input.templateKey) throw new ServiceError("idempotency_key_body_mismatch", 409);
      return { run: existing.data as { id: string; status: string }, duplicate: true };
    }
  }
  const template = await findTemplate(db, input.tenantId, input.templateKey);
  const run = check(
    await db
      .from("flow_runs")
      .insert({
        tenant_id: input.tenantId,
        template_key: template.key,
        template_version: template.version,
        goal: input.goal,
        idempotency_key: input.idempotencyKey,
        created_by: input.userId,
      })
      .select("*")
      .single(),
    "flow_run_create_failed",
  ) as { id: string; status: string };
  return { run, duplicate: false };
}

interface RunRow {
  id: string;
  tenant_id: string;
  template_key: string;
  template_version: string;
  goal: string;
  status: FlowRunStatus;
  cursor: number;
  outputs: Record<string, unknown>;
  created_by: string | null;
}

async function loadRun(db: Db, tenantId: string, runId: string): Promise<RunRow> {
  return check(await db.from("flow_runs").select("*").eq("id", runId).eq("tenant_id", tenantId).maybeSingle(), "flow_run") as RunRow;
}

async function saveRun(db: Db, run: RunRow, state: FlowRunState) {
  const result = await db
    .from("flow_runs")
    .update({ status: state.status, cursor: state.cursor, outputs: state.outputs, error: state.error ?? null, updated_at: new Date().toISOString() })
    .eq("id", run.id)
    .eq("tenant_id", run.tenant_id);
  if (result.error) throw new ServiceError("flow_run_save_failed");
}

/** Executes a run with the service client (Inngest). Safe to call again: completed/failed runs are left alone. */
export async function executeRun(admin: Db, tenantId: string, runId: string, deps: CoreDeps = {}) {
  const run = await loadRun(admin, tenantId, runId);
  if (!["pending", "running"].includes(run.status)) return { status: run.status, skipped: true };
  const template = await findTemplate(admin, tenantId, run.template_key, run.template_version);
  const userId = run.created_by ?? "system";
  const profile = await admin.from("profiles").select("role").eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle();
  const role: Role = isRole(profile.data?.role) ? profile.data.role : "viewer";
  const chunks = await loadVisibleChunks(admin, tenantId, userId);
  const tools = new ToolRegistry();
  const toolCtx = { tenantId, userId, role, chunks };
  const auditTool = async (record: ToolAuditRecord) =>
    audit(admin, { tenantId, actorType: "user", actorId: record.actorId, action: record.action, resourceType: "tool", resourceId: record.tool, payload: { runId, ...record.detail } });
  const toolOutput = async (name: string, input: unknown, approved = false) => {
    const result = await tools.invoke(name, input, toolCtx, auditTool, { approved });
    if (result.status !== "ok") throw new Error(`${name}:${result.error}`);
    return result.output;
  };

  const state = await advanceFlow(
    template,
    { status: run.status, cursor: run.cursor, outputs: run.outputs ?? {} },
    { goal: run.goal },
    {
      research: (config, input) => toolOutput("knowledge.search", { query: input.query, topK: Number(config.topK ?? 5) }),
      summarize: (config, input) => toolOutput("text.summarize", { text: input.text, maxSentences: Number(config.maxSentences ?? 3) }),
      generate: async (config, input) => {
        const budget = await monthlyBudget(admin, tenantId);
        const riskLevel = (["L1", "L2", "L3", "L4"].includes(String(config.riskLevel)) ? config.riskLevel : "L2") as "L1" | "L2" | "L3" | "L4";
        const result = await runCore({ ctx: { tenantId, userId, role }, question: input.question, riskLevel, chunks, budget }, deps);
        if (result.status === "blocked" || result.status === "denied") throw new Error(`generate:${result.status}`);
        await admin.from("model_calls").insert({
          tenant_id: tenantId,
          user_id: run.created_by,
          origin: "flow",
          provider: result.usage.provider,
          mock: result.usage.mock,
          ok: true,
          latency_ms: result.usage.latencyMs,
          tokens: result.usage.estimatedTokens,
          cost_cents: result.usage.costCents,
          fallback_used: result.usage.fallbackUsed,
          outcome: result.status,
          question: input.question.slice(0, 2000),
        });
        await admin.from("cost_events").insert({ tenant_id: tenantId, provider: result.usage.provider, cost_cents: result.usage.costCents, input_tokens: result.usage.estimatedTokens, output_tokens: 0 });
        return explainResult(result);
      },
      requestApproval: async (config, stepId) => {
        await requestApproval(admin, {
          tenantId,
          resourceType: "flow_run",
          resourceId: run.id,
          area: "flows",
          priority: "normal",
          reason: `'${template.name}' akışı '${stepId}' adımında onay bekliyor`,
          requestedBy: run.created_by,
        });
      },
      publish: (config, input) => toolOutput("content.publish", { channel: String(config.channel ?? "web"), content: input.content }, true),
      track: async (_config, outputs) => {
        const n = await notify(admin, { tenantId, kind: "task", area: "flows", title: `Akış tamamlandı: ${template.name}`, body: `Adımlar: ${Object.keys(outputs).join(", ")}` });
        return { notificationId: n.id };
      },
    },
  );
  await saveRun(admin, run, state);
  await audit(admin, { tenantId, actorType: "worker", actorId: "inngest", action: `flow.${state.status}`, resourceType: "flow_run", resourceId: run.id, payload: { cursor: state.cursor, error: state.error ?? null } });
  return { status: state.status, skipped: false };
}

/** Human decision on a pending approval. Returns what should be resumed. */
export async function decideApproval(db: Db, input: { tenantId: string; approvalId: string; userId: string; decision: "approved" | "rejected" }) {
  const approval = check(await db.from("approvals").select("*").eq("id", input.approvalId).eq("tenant_id", input.tenantId).maybeSingle(), "approval") as {
    id: string;
    status: string;
    resource_type: string;
    resource_id: string;
    requested_by: string | null;
  };
  if (approval.status !== "pending") throw new ServiceError("approval_already_decided", 409);
  if (approval.requested_by && approval.requested_by === input.userId) throw new ServiceError("self_approval_forbidden", 403);
  const updated = check(
    await db
      .from("approvals")
      .update({ status: input.decision, decided_by: input.userId, decided_at: new Date().toISOString() })
      .eq("id", approval.id)
      .eq("tenant_id", input.tenantId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle(),
    "approval_update",
  ) as { id: string; status: string };

  let resumeRunId: string | null = null;
  if (approval.resource_type === "flow_run") {
    const run = await loadRun(db, input.tenantId, approval.resource_id);
    const template = await findTemplate(db, input.tenantId, run.template_key, run.template_version);
    const next = applyApproval(template, { status: run.status, cursor: run.cursor, outputs: run.outputs ?? {} }, input.decision);
    await saveRun(db, run, next);
    if (next.status === "running") resumeRunId = run.id;
  }
  return { approval: updated, resumeRunId };
}
