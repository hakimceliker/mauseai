import { json, must, withTenant } from "@/src/server/http/tenant-route";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTenant("flow.run", async ({ client, tenantId }) => {
    const { id } = await params;
    return json({ run: must(await client.from("flow_runs").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(), "run") });
  });
}
