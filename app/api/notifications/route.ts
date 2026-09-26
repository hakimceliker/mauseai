import { json, must, withTenant } from "@/src/server/http/tenant-route";
import { buildDigest, type NotificationKind } from "@/src/lib/notifications/notifications";

/** N — in-app notifications plus a digest of unread items. Realtime clients subscribe to the same table. */
export async function GET() {
  return withTenant("notification.read", async ({ client, tenantId }) => {
    const unread = must(
      await client.from("notifications").select("*").eq("tenant_id", tenantId).is("read_at", null).order("created_at", { ascending: false }).limit(200),
      "notifications_load",
    ) as Array<{ kind: NotificationKind; title: string }>;
    return json({ notifications: unread, digest: buildDigest(unread) });
  });
}
