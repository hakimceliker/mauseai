import type { Env } from "@/src/lib/config/runtime";
import type { Team } from "@/src/lib/ownership/ownership";
import type { NotificationKind, Priority } from "./notifications";
import { senderStatus, type ExternalChannel } from "./senders";

/**
 * "Doğru kişiye, doğru zamanda" (card N): picks the tenant's routes for the
 * notification's RACI teams, filters by priority, and defers non-urgent
 * messages until the route's quiet hours end (in the route's time zone).
 */

export interface NotificationRoute {
  id: string;
  tenant_id: string;
  team: Team;
  channel: ExternalChannel;
  destination: string;
  min_priority: Priority;
  quiet_start_hour: number | null;
  quiet_end_hour: number | null;
  timezone: string;
  active: boolean;
}

export interface RoutableNotification {
  id: string;
  tenant_id: string;
  kind: NotificationKind;
  priority: Priority;
  recipient_teams: Team[];
}

export interface PlannedDelivery {
  tenant_id: string;
  notification_id: string;
  route_id: string;
  channel: ExternalChannel;
  destination: string;
  status: "pending" | "deferred" | "channel_not_configured";
  not_before: string;
}

const RANK: Record<Priority, number> = { low: 0, normal: 1, high: 2, urgent: 3 };

export function localHour(date: Date, timeZone: string): number {
  try {
    const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(date);
    return Number(hour) % 24;
  } catch {
    return date.getUTCHours();
  }
}

export function inQuietHours(hour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** Urgent always goes out; high-priority alerts and SLA escalations too. Everything else waits for quiet hours to end. */
export function bypassesQuietHours(kind: NotificationKind, priority: Priority): boolean {
  return priority === "urgent" || (priority === "high" && (kind === "alert" || kind === "sla"));
}

export function quietHoursEnd(now: Date, route: Pick<NotificationRoute, "quiet_start_hour" | "quiet_end_hour" | "timezone">): Date {
  const t = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  for (let i = 0; i < 24 * 60; i++) {
    if (!inQuietHours(localHour(t, route.timezone), route.quiet_start_hour, route.quiet_end_hour)) return t;
    t.setTime(t.getTime() + 60_000);
  }
  return t;
}

export function planDeliveries(notification: RoutableNotification, routes: NotificationRoute[], now = new Date(), env: Env = process.env): PlannedDelivery[] {
  const planned: PlannedDelivery[] = [];
  const seen = new Set<string>();
  for (const route of routes) {
    // Tenant isolation is enforced here as well as in the query and RLS.
    if (route.tenant_id !== notification.tenant_id || !route.active) continue;
    if (!notification.recipient_teams.includes(route.team)) continue;
    if (RANK[notification.priority] < RANK[route.min_priority]) continue;
    const key = `${route.channel}:${route.destination.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const base = { tenant_id: notification.tenant_id, notification_id: notification.id, route_id: route.id, channel: route.channel, destination: route.destination };
    if (!senderStatus(route.channel, env).configured) {
      planned.push({ ...base, status: "channel_not_configured", not_before: now.toISOString() });
      continue;
    }
    const quiet = inQuietHours(localHour(now, route.timezone), route.quiet_start_hour, route.quiet_end_hour);
    if (quiet && !bypassesQuietHours(notification.kind, notification.priority)) {
      planned.push({ ...base, status: "deferred", not_before: quietHoursEnd(now, route).toISOString() });
    } else {
      planned.push({ ...base, status: "pending", not_before: now.toISOString() });
    }
  }
  return planned;
}

/** Exponential retry schedule for failed sends: 1, 2, 4, 8 minutes, then give up. */
export const MAX_DELIVERY_ATTEMPTS = 5;
export function nextAttemptAt(attempts: number, now = new Date()): Date {
  return new Date(now.getTime() + 60_000 * 2 ** Math.max(0, attempts - 1));
}
