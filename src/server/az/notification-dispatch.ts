import type { Env } from "@/src/lib/config/runtime";
import { createSender, senderStatus, type ExternalChannel, type Sender } from "@/src/lib/notifications/senders";
import { MAX_DELIVERY_ATTEMPTS, nextAttemptAt, planDeliveries, type NotificationRoute, type RoutableNotification } from "@/src/lib/notifications/routing";
import { safeErrorMessage } from "@/src/lib/security/redact";
import { audit, type Db } from "./records";

/**
 * Background notification dispatch (service-role client, Inngest cron):
 *   1. plan — recent notifications × tenant routes → notification_deliveries
 *      (idempotent: the unique key ignores duplicates, existing state is kept);
 *   2. send — due deliveries go out through the configured sender; failures
 *      are retried with backoff and marked failed after MAX_DELIVERY_ATTEMPTS.
 */

export async function planRecentNotifications(admin: Db, input: { now?: Date; lookbackMinutes?: number; env?: Env } = {}) {
  const now = input.now ?? new Date();
  const since = new Date(now.getTime() - (input.lookbackMinutes ?? 15) * 60_000).toISOString();
  const recent = await admin
    .from("notifications")
    .select("id,tenant_id,kind,priority,recipient_teams")
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);
  if (recent.error) throw new Error("notification_plan_load_failed");
  const notifications = (recent.data ?? []) as RoutableNotification[];
  if (!notifications.length) return { planned: 0 };

  const tenantIds = [...new Set(notifications.map((n) => n.tenant_id))];
  const routesResult = await admin.from("notification_routes").select("*").in("tenant_id", tenantIds).eq("active", true);
  if (routesResult.error) throw new Error("notification_routes_load_failed");
  const routes = (routesResult.data ?? []) as NotificationRoute[];

  let planned = 0;
  for (const notification of notifications) {
    const rows = planDeliveries(notification, routes.filter((r) => r.tenant_id === notification.tenant_id), now, input.env);
    if (!rows.length) continue;
    const result = await admin
      .from("notification_deliveries")
      .upsert(rows, { onConflict: "notification_id,channel,destination", ignoreDuplicates: true });
    if (result.error) throw new Error("notification_plan_write_failed");
    planned += rows.length;
  }
  return { planned };
}

interface DeliveryRow {
  id: string;
  tenant_id: string;
  notification_id: string;
  channel: ExternalChannel;
  destination: string;
  status: string;
  attempts: number;
}

export async function sendDueDeliveries(
  admin: Db,
  input: { now?: Date; env?: Env; senders?: Partial<Record<ExternalChannel, Sender>>; limit?: number } = {},
) {
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const due = await admin
    .from("notification_deliveries")
    .select("id,tenant_id,notification_id,channel,destination,status,attempts")
    .in("status", ["pending", "deferred"])
    .lte("not_before", now.toISOString())
    .order("not_before", { ascending: true })
    .limit(input.limit ?? 100);
  if (due.error) throw new Error("notification_due_load_failed");

  const summary = { sent: 0, failed: 0, retrying: 0, notConfigured: 0 };
  for (const delivery of (due.data ?? []) as DeliveryRow[]) {
    const notification = await admin
      .from("notifications")
      .select("id,tenant_id,kind,priority,title,body")
      .eq("id", delivery.notification_id)
      .eq("tenant_id", delivery.tenant_id)
      .maybeSingle();
    if (notification.error || !notification.data) {
      await admin.from("notification_deliveries").update({ status: "failed", last_error: "notification_not_found" }).eq("id", delivery.id).eq("tenant_id", delivery.tenant_id);
      summary.failed += 1;
      continue;
    }
    if (!senderStatus(delivery.channel, env).configured && !input.senders?.[delivery.channel]) {
      await admin.from("notification_deliveries").update({ status: "channel_not_configured" }).eq("id", delivery.id).eq("tenant_id", delivery.tenant_id);
      summary.notConfigured += 1;
      continue;
    }
    const n = notification.data as { kind: RoutableNotification["kind"]; priority: RoutableNotification["priority"]; title: string; body: string };
    const attempts = delivery.attempts + 1;
    try {
      const send = input.senders?.[delivery.channel] ?? createSender(delivery.channel, env);
      await send({ destination: delivery.destination, kind: n.kind, priority: n.priority, title: n.title, body: n.body });
      await admin
        .from("notification_deliveries")
        .update({ status: "sent", attempts, sent_at: now.toISOString(), last_error: null })
        .eq("id", delivery.id)
        .eq("tenant_id", delivery.tenant_id);
      summary.sent += 1;
    } catch (error) {
      const giveUp = attempts >= MAX_DELIVERY_ATTEMPTS;
      await admin
        .from("notification_deliveries")
        .update({
          status: giveUp ? "failed" : "pending",
          attempts,
          last_error: safeErrorMessage(error, env, 200),
          not_before: giveUp ? now.toISOString() : nextAttemptAt(attempts, now).toISOString(),
        })
        .eq("id", delivery.id)
        .eq("tenant_id", delivery.tenant_id);
      if (giveUp) {
        summary.failed += 1;
        await audit(admin, {
          tenantId: delivery.tenant_id,
          actorType: "worker",
          actorId: "notification-dispatcher",
          action: "notification.delivery_failed",
          resourceType: "notification",
          resourceId: delivery.notification_id,
          payload: { channel: delivery.channel, attempts },
        });
      } else summary.retrying += 1;
    }
  }
  return summary;
}
