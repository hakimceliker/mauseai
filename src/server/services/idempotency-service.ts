type SupabaseClient = Awaited<
  ReturnType<typeof import("@/src/lib/supabase/server").getSupabaseServerClient>
>;

export async function getIdempotentResponse(
  client: SupabaseClient,
  tenantId: string,
  key: string,
  requestHash: string,
) {
  const { data, error } = await client
    .from("idempotency_keys")
    .select("status_code,response,request_hash,expires_at")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (data.request_hash !== requestHash)
    throw new Error("idempotency_key_body_mismatch");
  return { status: data.status_code, body: data.response };
}

export async function saveIdempotentResponse(
  client: SupabaseClient,
  tenantId: string,
  key: string,
  requestHash: string,
  statusCode: number,
  body: unknown,
) {
  const { error } = await client.from("idempotency_keys").upsert(
    {
      tenant_id: tenantId,
      key,
      request_hash: requestHash,
      status_code: statusCode,
      response: body,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "tenant_id,key", ignoreDuplicates: true },
  );
  if (error) throw new Error(`idempotency_save_failed:${error.message}`);
}
