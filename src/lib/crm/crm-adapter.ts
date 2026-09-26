import { z } from "zod";
import { ConfigurationError, intSetting, type Env } from "@/src/lib/config/runtime";
import { resilientFetch, type FetchLike } from "@/src/lib/http/resilient-fetch";

/**
 * CRM adapter (card C — "CRM yüzeyleri"). The implemented provider is HubSpot
 * (private app token in CRM_API_KEY). Tenant isolation:
 *   - the tenant always comes from the caller's session, never the payload;
 *   - local mappings live in crm_sync_records (RLS per tenant);
 *   - with CRM_TENANT_PROPERTY set, every contact is stamped with the tenant
 *     id and a contact owned by another tenant is never overwritten.
 */

export const ContactSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  company: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
});
export type CrmContact = z.infer<typeof ContactSchema>;

export class CrmError extends Error {
  constructor(
    public readonly code: "crm_record_owned_by_other_tenant" | "crm_request_failed" | "crm_bad_response",
    public readonly status = 502,
  ) {
    super(code);
    this.name = "CrmError";
  }
}

export interface CrmAdapter {
  readonly provider: string;
  upsertContact(tenantId: string, contact: CrmContact): Promise<{ crmId: string }>;
  addNote(tenantId: string, crmContactId: string, note: string): Promise<{ crmId: string }>;
}

export const CRM_ENV = ["CRM_API_KEY"] as const;

export function crmStatus(env: Env = process.env) {
  const missingEnv = CRM_ENV.filter((k) => !env[k]);
  return { configured: missingEnv.length === 0, provider: (env.CRM_PROVIDER || "hubspot").toLowerCase(), missingEnv };
}

export class HubSpotCrmAdapter implements CrmAdapter {
  readonly provider = "hubspot";
  private readonly base: string;

  constructor(
    private readonly options: { apiKey: string; baseUrl?: string; tenantProperty?: string; timeoutMs?: number; retries?: number; fetchImpl?: FetchLike },
  ) {
    this.base = (options.baseUrl || "https://api.hubapi.com").replace(/\/+$/, "");
  }

  private async request(path: string, init: { method: string; body?: unknown }, allow404 = false): Promise<unknown> {
    try {
      const response = await resilientFetch(
        `${this.base}${path}`,
        {
          method: init.method,
          headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        },
        { timeoutMs: this.options.timeoutMs ?? 10_000, retries: this.options.retries ?? 2, fetchImpl: this.options.fetchImpl },
      );
      return await response.json();
    } catch (error) {
      if (allow404 && (error as { status?: number }).status === 404) return null;
      throw new CrmError("crm_request_failed");
    }
  }

  async upsertContact(tenantId: string, contact: CrmContact): Promise<{ crmId: string }> {
    const tenantProperty = this.options.tenantProperty;
    if (tenantProperty) {
      const existing = (await this.request(
        `/crm/v3/objects/contacts/${encodeURIComponent(contact.email)}?idProperty=email&properties=${encodeURIComponent(tenantProperty)}`,
        { method: "GET" },
        true,
      )) as { properties?: Record<string, string | null> } | null;
      const owner = existing?.properties?.[tenantProperty];
      if (owner && owner !== tenantId) throw new CrmError("crm_record_owned_by_other_tenant", 409);
    }
    const properties: Record<string, string> = { email: contact.email };
    if (contact.firstName) properties.firstname = contact.firstName;
    if (contact.lastName) properties.lastname = contact.lastName;
    if (contact.company) properties.company = contact.company;
    if (contact.phone) properties.phone = contact.phone;
    if (tenantProperty) properties[tenantProperty] = tenantId;
    const body = (await this.request("/crm/v3/objects/contacts/batch/upsert", {
      method: "POST",
      body: { inputs: [{ idProperty: "email", id: contact.email, properties }] },
    })) as { results?: Array<{ id?: string }> };
    const id = body?.results?.[0]?.id;
    if (!id) throw new CrmError("crm_bad_response");
    return { crmId: String(id) };
  }

  async addNote(_tenantId: string, crmContactId: string, note: string): Promise<{ crmId: string }> {
    const body = (await this.request("/crm/v3/objects/notes", {
      method: "POST",
      body: {
        properties: { hs_note_body: note.slice(0, 65_000), hs_timestamp: new Date().toISOString() },
        // 202 = HubSpot-defined note → contact association.
        associations: [{ to: { id: crmContactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }],
      },
    })) as { id?: string };
    if (!body?.id) throw new CrmError("crm_bad_response");
    return { crmId: String(body.id) };
  }
}

/** Returns the configured adapter or throws ConfigurationError("crm_not_configured"). */
export function createCrmAdapter(env: Env = process.env, fetchImpl?: FetchLike): CrmAdapter {
  const status = crmStatus(env);
  if (!status.configured) throw new ConfigurationError("crm_not_configured", status.missingEnv);
  if (status.provider !== "hubspot") throw new ConfigurationError("crm_provider_unsupported", ["CRM_PROVIDER"]);
  return new HubSpotCrmAdapter({
    apiKey: env.CRM_API_KEY!,
    baseUrl: env.CRM_BASE_URL,
    tenantProperty: env.CRM_TENANT_PROPERTY || undefined,
    timeoutMs: intSetting(env, "CRM_TIMEOUT_MS", 10_000, { min: 1_000, max: 60_000 }),
    retries: intSetting(env, "CRM_MAX_RETRIES", 2, { min: 0, max: 5 }),
    fetchImpl,
  });
}
