import { json, must, withTenant } from "@/src/server/http/tenant-route";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTenant("notification.read", async ({ client, tenantId }) => {
    const { id } = await params;
    const row = must(
      await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantId).select("id,read_at").maybeSingle(),
      "notification",
    );
    return json({ notification: row });
  });
}
