import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { writeAudit } from "./audit-service";
import { evaluateCost } from "@/src/core/cost/cost-controller";

export async function recordCost(params: {
  tenantId: string;
  taskId: string;
  stepId?: string;
  traceId?: string;
  provider: string;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("spent_cents,budget_limit_cents")
    .eq("id", params.taskId)
    .eq("tenant_id", params.tenantId)
    .single();
  if (readError) throw readError;
  const evaluation = evaluateCost({
    spentCents: task.spent_cents ?? 0,
    estimatedCents: params.costCents,
    budgetLimitCents: task.budget_limit_cents,
  });
  if (evaluation.decision === "BLOCKED") {
    const error = new Error("BUDGET_EXCEEDED");
    Object.assign(error, { code: "BUDGET_EXCEEDED" });
    throw error;
  }
  const traceId = params.traceId ?? `task:${params.taskId}:step:${params.stepId ?? 'task'}:cost`;
  const { data: event, error } = await supabase.from("cost_events").upsert({
    tenant_id: params.tenantId,
    task_id: params.taskId,
    step_id: params.stepId ?? null,
    trace_id: traceId,
    provider: params.provider,
    cost_cents: params.costCents,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
  }, { onConflict: 'task_id,trace_id', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw error;
  if (!event) {
    return {
      spentCents: task.spent_cents ?? 0,
      budgetLimitCents: task.budget_limit_cents,
      decision: 'DUPLICATE',
    };
  }
  const nextSpent = evaluation.projectedCents;
  const { error: updateError } = await supabase
    .from("tasks")
    .update({ spent_cents: nextSpent, updated_at: new Date().toISOString() })
    .eq("id", params.taskId)
    .eq("tenant_id", params.tenantId);
  if (updateError) throw updateError;
  await writeAudit({
    tenantId: params.tenantId,
    taskId: params.taskId,
    stepId: params.stepId,
    actorType: "worker",
    actorId: params.provider,
    action: "cost.recorded",
    resourceType: "task",
    resourceId: params.taskId,
    traceId: params.traceId,
    costCents: params.costCents,
    payload: {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costDecision: evaluation.decision,
      utilizationPercent: evaluation.utilizationPercent,
    },
  });
  return { spentCents: nextSpent, budgetLimitCents: task.budget_limit_cents, decision: evaluation.decision };
}
