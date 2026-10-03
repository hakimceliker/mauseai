import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";

export async function writeAudit(params: {
  tenantId: string;
  taskId?: string;
  stepId?: string;
  actorType: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
  costCents?: number | null;
  riskLevel?: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: params.tenantId,
    task_id: params.taskId ?? null,
    step_id: params.stepId ?? null,
    actor_type: params.actorType,
    actor_id: params.actorId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    payload: params.payload ?? {},
    cost_cents: params.costCents ?? null,
    risk_level: params.riskLevel ?? null,
  });
  if (error) throw error;
}
