import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTenantContext(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("tenant_id,role")
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return {
    tenantId: data.tenant_id as string,
    role: data.role as "owner" | "admin" | "member",
  };
}
