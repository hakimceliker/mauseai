import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { writeAudit } from "./audit-service";

export async function recordCost(params: {
  tenantId: string;
  taskId: string;
  stepId?: string;
  provider: string;
  costCents: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("cost_events").insert({
    tenant_id: params.tenantId,
    task_id: params.taskId,
    step_id: params.stepId ?? null,
    provider: params.provider,
    cost_cents: params.costCents,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
  });
  if (error) throw error;
  const { data: task, error: readError } = await supabase
    .from("tasks")
    .select("spent_cents,budget_limit_cents")
    .eq("id", params.taskId)
    .eq("tenant_id", params.tenantId)
    .single();
  if (readError) throw readError;
  const nextSpent = (task.spent_cents ?? 0) + (params.costCents ?? 0);
  if (task.budget_limit_cents !== null && nextSpent > task.budget_limit_cents) {
    const error = new Error("BUDGET_EXCEEDED");
    Object.assign(error, { code: "BUDGET_EXCEEDED" });
    throw error;
  }
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
    costCents: params.costCents,
    payload: {
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
    },
  });
  return { spentCents: nextSpent, budgetLimitCents: task.budget_limit_cents };
}
