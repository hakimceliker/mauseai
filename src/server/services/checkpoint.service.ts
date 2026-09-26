import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";

export type CheckpointState = Record<string, unknown>;

export async function saveCheckpoint(params: {
  tenantId: string;
  taskId: string;
  stepId: string;
  version: number;
  state: CheckpointState;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("checkpoints")
    .upsert(
      {
        tenant_id: params.tenantId,
        task_id: params.taskId,
        step_id: params.stepId,
        version: params.version,
        state: params.state,
      },
      { onConflict: "task_id,step_id,version", ignoreDuplicates: true },
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  return { ok: true, data, duplicate: !data };
}

export async function getLatestCheckpoint(taskId: string, tenantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("task_id", taskId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCheckpoint(
  taskId: string,
  stepId: string,
  version: number,
  tenantId: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("checkpoints")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("task_id", taskId)
    .eq("step_id", stepId)
    .eq("version", version)
    .maybeSingle();
  if (error) throw error;
  return data;
}
