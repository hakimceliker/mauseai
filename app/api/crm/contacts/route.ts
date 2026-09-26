import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { ContactSchema, createCrmAdapter } from "@/src/lib/crm/crm-adapter";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { syncContact } from "@/src/server/az/crm-service";

/**
 * C — CRM surface: upsert a contact (optionally with a note) into the
 * configured CRM for the caller's tenant. Without CRM_API_KEY the route
 * answers 503 crm_not_configured and nothing is sent.
 */
export async function POST(request: Request) {
  return withTenant("crm.sync", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, z.object({ contact: ContactSchema, note: z.string().trim().min(1).max(10_000).optional() }));
    const adapter = createCrmAdapter();
    const result = await syncContact(client, getSupabaseAdminClient(), { tenantId, userId, contact: body.contact, note: body.note }, adapter);
    return json(result, 200);
  });
}

export async function GET() {
  return withTenant("crm.sync", async ({ client, tenantId }) => {
    const records = await client
      .from("crm_sync_records")
      .select("entity_type,local_key,crm_provider,crm_id,last_synced_at")
      .eq("tenant_id", tenantId)
      .order("last_synced_at", { ascending: false })
      .limit(100);
    if (records.error) return json({ error: "crm_records_load" }, 500);
    return json({ records: records.data });
  });
}
