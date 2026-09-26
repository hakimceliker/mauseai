import { createCrmAdapter, CrmError, type CrmAdapter, type CrmContact } from "@/src/lib/crm/crm-adapter";
import { audit, ServiceError, type Db } from "./records";

/**
 * CRM sync (card C): upserts a contact (and an optional note) for the caller's
 * tenant, records the mapping in crm_sync_records and audits every attempt.
 * Audit payloads carry the e-mail domain only, not the address.
 */
export async function syncContact(
  db: Db,
  admin: Db,
  input: { tenantId: string; userId: string; contact: CrmContact; note?: string },
  adapter: CrmAdapter = createCrmAdapter(),
) {
  const localKey = input.contact.email;
  const domain = localKey.split("@")[1] ?? null;
  try {
    const { crmId } = await adapter.upsertContact(input.tenantId, input.contact);
    const mapping = await db
      .from("crm_sync_records")
      .upsert(
        {
          tenant_id: input.tenantId,
          entity_type: "contact",
          local_key: localKey,
          crm_provider: adapter.provider,
          crm_id: crmId,
          synced_by: input.userId,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,entity_type,local_key" },
      )
      .select("id,crm_id")
      .single();
    if (mapping.error) throw new ServiceError("crm_mapping_failed");
    let noteId: string | null = null;
    if (input.note) noteId = (await adapter.addNote(input.tenantId, crmId, input.note)).crmId;
    await audit(admin, {
      tenantId: input.tenantId,
      actorType: "user",
      actorId: input.userId,
      action: "crm.contact_synced",
      resourceType: "crm_contact",
      resourceId: crmId,
      payload: { provider: adapter.provider, domain, note: noteId !== null },
    });
    return { provider: adapter.provider, crmId, noteId };
  } catch (error) {
    const code = error instanceof CrmError || error instanceof ServiceError ? error.code : "crm_request_failed";
    await audit(admin, {
      tenantId: input.tenantId,
      actorType: "user",
      actorId: input.userId,
      action: "crm.sync_failed",
      resourceType: "crm_contact",
      payload: { provider: adapter.provider, domain, error: code },
    });
    if (error instanceof CrmError) throw new ServiceError(error.code, error.status);
    throw error;
  }
}
