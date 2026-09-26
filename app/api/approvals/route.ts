import { json, must, withTenant } from "@/src/server/http/tenant-route";

/** N — approvals waiting for a human. */
export async function GET(request: Request) {
  return withTenant("notification.read", async ({ client, tenantId }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "pending";
    return json({ approvals: must(await client.from("approvals").select("*").eq("tenant_id", tenantId).eq("status", status).order("due_at", { ascending: true }).limit(200), "approvals_load") });
  });
}
