import type { CreateTaskInput } from "@/src/lib/schemas/task";
import { TaskStatus } from "@/src/types/enums";

type SupabaseClient = Awaited<
  ReturnType<typeof import("@/src/lib/supabase/server").getSupabaseServerClient>
>;

export async function createTask(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateTaskInput,
) {
  const { data, error } = await client
    .from("tasks")
    .insert({
      tenant_id: tenantId,
      created_by: userId,
      goal: input.goal,
      status: TaskStatus.PENDING,
      risk_level: input.riskLevel,
      budget_limit_cents: input.budgetLimitCents ?? null,
      spent_cents: 0,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getTask(
  client: SupabaseClient,
  tenantId: string,
  taskId: string,
) {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", taskId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function cancelTask(
  client: SupabaseClient,
  tenantId: string,
  taskId: string,
) {
  const { data, error } = await client
    .from("tasks")
    .update({
      status: TaskStatus.CANCELLED,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId)
    .eq("id", taskId)
    .in("status", [
      TaskStatus.PENDING,
      TaskStatus.PLANNING,
      TaskStatus.PAUSED,
      TaskStatus.WAITING_APPROVAL,
    ])
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
