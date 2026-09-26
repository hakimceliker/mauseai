import { z } from "zod";
import { json, must, HttpError, withTenant } from "@/src/server/http/tenant-route";

/** N — delivery state per external channel for one notification (sent / deferred / failed / channel_not_configured). */
export async function GET(request: Request) {
  return withTenant("notification.read", async ({ client, tenantId }) => {
    const id = new URL(request.url).searchParams.get("notificationId");
    if (!id || !z.string().uuid().safeParse(id).success) throw new HttpError(400, "invalid_request");
    const deliveries = must(
      await client
        .from("notification_deliveries")
        .select("id,notification_id,channel,destination,status,not_before,attempts,last_error,sent_at")
        .eq("tenant_id", tenantId)
        .eq("notification_id", id)
        .order("created_at", { ascending: true }),
      "deliveries_load",
    );
    return json({ deliveries });
  });
}
