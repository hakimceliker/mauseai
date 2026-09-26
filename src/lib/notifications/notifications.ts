import { isChannelAvailable } from "@/src/lib/channels/channels";
import { accountableTeam, responsibleTeams, type Area, type Team } from "@/src/lib/ownership/ownership";

/**
 * Notifications (diagram card N, edge N→T): görev, uyarı, özet, insan onayı
 * ve SLA takibi — routed to the RACI owner of the area ("doğru kişiye").
 */

export type NotificationKind = "task" | "alert" | "digest" | "approval" | "sla";
export type Priority = "low" | "normal" | "high" | "urgent";

/** Minutes a human has to act on an approval, per priority. */
export const APPROVAL_SLA_MINUTES: Record<Priority, number> = { low: 24 * 60, normal: 8 * 60, high: 2 * 60, urgent: 30 };

export interface NotificationDraft {
  kind: NotificationKind;
  area: Area;
  priority: Priority;
  title: string;
  body: string;
  recipientTeams: Team[];
  channel: string;
  dueAt: string | null;
}

export function draftNotification(input: {
  kind: NotificationKind;
  area: Area;
  priority?: Priority;
  title: string;
  body: string;
  channel?: string;
  now?: Date;
}): NotificationDraft {
  const priority = input.priority ?? "normal";
  const now = input.now ?? new Date();
  // Approvals and escalations go to the accountable team; everything else to those responsible.
  const recipientTeams =
    input.kind === "approval" || input.kind === "sla" ? [accountableTeam(input.area)] : responsibleTeams(input.area);
  const dueAt = input.kind === "approval" ? new Date(now.getTime() + APPROVAL_SLA_MINUTES[priority] * 60_000).toISOString() : null;
  return { kind: input.kind, area: input.area, priority, title: input.title, body: input.body, recipientTeams, channel: input.channel ?? "web", dueAt };
}

export type DeliveryStatus = "delivered_in_app" | "sent" | "skipped_channel_not_configured" | "failed";

/**
 * In-app (web) delivery is the stored notification itself. External channels
 * are only attempted when the channel is configured; otherwise the result
 * says so instead of pretending the message went out.
 */
export async function deliver(
  draft: NotificationDraft,
  sendExternal: (draft: NotificationDraft) => Promise<{ ok: boolean }>,
  env: Record<string, string | undefined> = process.env,
): Promise<DeliveryStatus> {
  if (draft.channel === "web") return "delivered_in_app";
  if (!isChannelAvailable(draft.channel, env)) return "skipped_channel_not_configured";
  try {
    const result = await sendExternal(draft);
    return result.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export interface PendingApproval {
  id: string;
  area: Area;
  priority: Priority;
  dueAt: string;
  escalatedAt?: string | null;
}

export function overdueApprovals(approvals: PendingApproval[], now = new Date()): PendingApproval[] {
  return approvals.filter((a) => !a.escalatedAt && new Date(a.dueAt).getTime() < now.getTime());
}

const ESCALATE: Record<Priority, Priority> = { low: "normal", normal: "high", high: "urgent", urgent: "urgent" };

export function escalation(approval: PendingApproval, now = new Date()): NotificationDraft {
  const minutesLate = Math.round((now.getTime() - new Date(approval.dueAt).getTime()) / 60_000);
  return draftNotification({
    kind: "sla",
    area: approval.area,
    priority: ESCALATE[approval.priority],
    title: "Onay SLA süresi aşıldı",
    body: `Onay ${approval.id} ${minutesLate} dakika gecikti.`,
    now,
  });
}

export function buildDigest(items: Array<{ kind: NotificationKind; title: string }>): { title: string; body: string } | null {
  if (!items.length) return null;
  const counts = new Map<NotificationKind, number>();
  for (const item of items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  const summary = [...counts.entries()].map(([kind, count]) => `${kind}: ${count}`).join(", ");
  return { title: `Özet: ${items.length} okunmamış bildirim`, body: `${summary}\n${items.slice(0, 10).map((i) => `• ${i.title}`).join("\n")}` };
}
