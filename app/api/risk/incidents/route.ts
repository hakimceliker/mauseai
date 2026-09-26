import { json, must, withTenant } from "@/src/server/http/tenant-route";

export async function GET() {
  return withTenant("risk.scan", async ({ client, tenantId }) =>
    json({ incidents: must(await client.from("risk_incidents").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(200), "incidents_load") }),
  );
}
