import { describe, expect, it } from "vitest";
import { ContactSchema, createCrmAdapter, crmStatus, CrmError, HubSpotCrmAdapter } from "@/src/lib/crm/crm-adapter";
import { ConfigurationError } from "@/src/lib/config/runtime";

type Handler = (url: string, init: RequestInit) => Response;

function fakeHubSpot(handler: Handler) {
  const calls: Array<{ url: string; method: string; auth: string; body: unknown }> = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: String(init.method),
      auth: (init.headers as Record<string, string>).Authorization,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return handler(url, init);
  };
  return { calls, fetchImpl };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("CRM configuration", () => {
  it("reports crm_not_configured with env names only", () => {
    expect(crmStatus({})).toEqual({ configured: false, provider: "hubspot", missingEnv: ["CRM_API_KEY"] });
    const error = (() => {
      try {
        createCrmAdapter({});
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(ConfigurationError);
    expect(error).toMatchObject({ code: "crm_not_configured", missingEnv: ["CRM_API_KEY"] });
  });

  it("refuses unsupported providers instead of faking them", () => {
    expect(() => createCrmAdapter({ CRM_API_KEY: "k", CRM_PROVIDER: "salesforce" })).toThrow("crm_provider_unsupported");
  });

  it("normalises and validates contacts", () => {
    expect(ContactSchema.parse({ email: "  Ada@Example.COM " }).email).toBe("ada@example.com");
    expect(ContactSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("HubSpotCrmAdapter", () => {
  it("upserts a contact by email with a bearer token", async () => {
    const hub = fakeHubSpot(() => json({ results: [{ id: "901" }] }));
    const adapter = new HubSpotCrmAdapter({ apiKey: "pat-test", fetchImpl: hub.fetchImpl, retries: 0 });
    expect(await adapter.upsertContact("t1", { email: "ada@example.com", firstName: "Ada", company: "ACME" })).toEqual({ crmId: "901" });
    expect(hub.calls).toHaveLength(1);
    expect(hub.calls[0]).toMatchObject({ url: "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", method: "POST", auth: "Bearer pat-test" });
    expect(hub.calls[0].body).toEqual({
      inputs: [{ idProperty: "email", id: "ada@example.com", properties: { email: "ada@example.com", firstname: "Ada", company: "ACME" } }],
    });
  });

  it("stamps the tenant and refuses to overwrite another tenant's contact", async () => {
    const hub = fakeHubSpot((url) =>
      url.includes("idProperty=email") ? json({ properties: { mouseai_tenant_id: "t2" } }) : json({ results: [{ id: "1" }] }),
    );
    const adapter = new HubSpotCrmAdapter({ apiKey: "k", tenantProperty: "mouseai_tenant_id", fetchImpl: hub.fetchImpl, retries: 0 });
    const error = await adapter.upsertContact("t1", { email: "ada@example.com" }).catch((e) => e);
    expect(error).toBeInstanceOf(CrmError);
    expect(error).toMatchObject({ code: "crm_record_owned_by_other_tenant", status: 409 });
    expect(hub.calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("creates a new contact stamped with the tenant when none exists (404)", async () => {
    const hub = fakeHubSpot((url) => (url.includes("idProperty=email") ? json({ message: "not found" }, 404) : json({ results: [{ id: "77" }] })));
    const adapter = new HubSpotCrmAdapter({ apiKey: "k", tenantProperty: "mouseai_tenant_id", fetchImpl: hub.fetchImpl, retries: 0 });
    expect(await adapter.upsertContact("t1", { email: "new@example.com" })).toEqual({ crmId: "77" });
    const upsert = hub.calls.find((c) => c.method === "POST")!.body as { inputs: Array<{ properties: Record<string, string> }> };
    expect(upsert.inputs[0].properties.mouseai_tenant_id).toBe("t1");
  });

  it("retries 5xx and maps failures to crm_request_failed without leaking the key", async () => {
    let n = 0;
    const hub = fakeHubSpot(() => (++n < 3 ? json({}, 503) : json({ results: [{ id: "5" }] })));
    const adapter = new HubSpotCrmAdapter({ apiKey: "pat-secret-value", fetchImpl: hub.fetchImpl, retries: 2 });
    // Real backoff delays are short (ms) but avoid them by allowing success on the 3rd try.
    expect(await adapter.upsertContact("t1", { email: "a@example.com" })).toEqual({ crmId: "5" });
    expect(hub.calls).toHaveLength(3);

    const down = fakeHubSpot(() => json({ message: "unauthorized" }, 401));
    const failing = new HubSpotCrmAdapter({ apiKey: "pat-secret-value", fetchImpl: down.fetchImpl, retries: 2 });
    const error = await failing.upsertContact("t1", { email: "a@example.com" }).catch((e) => e);
    expect(error).toMatchObject({ code: "crm_request_failed" });
    expect(String(error.message)).not.toContain("pat-secret-value");
    expect(down.calls).toHaveLength(1); // 401 is not retried
  });

  it("rejects a response without an id", async () => {
    const hub = fakeHubSpot(() => json({ results: [] }));
    const adapter = new HubSpotCrmAdapter({ apiKey: "k", fetchImpl: hub.fetchImpl, retries: 0 });
    await expect(adapter.upsertContact("t1", { email: "a@example.com" })).rejects.toMatchObject({ code: "crm_bad_response" });
  });

  it("adds a note associated with the contact", async () => {
    const hub = fakeHubSpot(() => json({ id: "n9" }));
    const adapter = new HubSpotCrmAdapter({ apiKey: "k", fetchImpl: hub.fetchImpl, retries: 0 });
    expect(await adapter.addNote("t1", "901", "Görüşme notu")).toEqual({ crmId: "n9" });
    const body = hub.calls[0].body as { associations: Array<{ to: { id: string }; types: Array<{ associationTypeId: number }> }> };
    expect(body.associations[0].to.id).toBe("901");
    expect(body.associations[0].types[0].associationTypeId).toBe(202);
  });
});
