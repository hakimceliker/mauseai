import { draftNotification, deliver, type NotificationKind, type Priority } from "@/src/lib/notifications/notifications";
import type { Area } from "@/src/lib/ownership/ownership";
import type { IncidentDraft } from "@/src/lib/risk/risk-scanner";
import { writeAudit } from "@/src/server/services/audit-service";

/**
 * Shared writers for the A–Z services. Every function takes the client it
 * writes with, so routes pass the user's RLS client and background jobs the
 * service-role client — and tests can pass a real Postgres-backed client.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (table: string) => any };

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 500,
  ) {
    super(code);
  }
}

export function check<T>(result: { data: T | null; error: { message: string; code?: string } | null }, code: string): T {
  if (result.error) throw new ServiceError(result.error.code === "23505" ? `${code}_conflict` : code, result.error.code === "23505" ? 409 : 500);
  if (result.data === null || result.data === undefined) throw new ServiceError(`${code}_not_found`, 404);
  return result.data;
}

export async function audit(
  admin: Db,
  params: { tenantId: string; actorType: string; actorId: string; action: string; resourceType: string; resourceId?: string; payload?: Record<string, unknown>; costCents?: number; riskLevel?: string },
) {
  await writeAudit(params, admin as never);
}

export async function notify(
  db: Db,
  input: { tenantId: string; kind: NotificationKind; area: Area; priority?: Priority; title: string; body: string; channel?: string },
) {
  const draft = draftNotification(input);
  // External senders are not wired in this repo: a non-web channel without credentials is recorded as skipped.
  const delivery = await deliver(draft, async () => ({ ok: false }));
  return check(
    await db
      .from("notifications")
      .insert({
        tenant_id: input.tenantId,
        kind: draft.kind,
        area: draft.area,
        priority: draft.priority,
        title: draft.title,
        body: draft.body,
        recipient_teams: draft.recipientTeams,
        channel: draft.channel,
        delivery_status: delivery,
        due_at: draft.dueAt,
      })
      .select("*")
      .single(),
    "notification_create_failed",
  ) as { id: string; delivery_status: string };
}

export async function requestApproval(
  db: Db,
  input: { tenantId: string; resourceType: string; resourceId: string; area: Area; priority?: Priority; reason: string; requestedBy: string | null },
) {
  const draft = draftNotification({ kind: "approval", area: input.area, priority: input.priority, title: "Onay bekleniyor", body: input.reason });
  const existing = await db
    .from("approvals")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("resource_type", input.resourceType)
    .eq("resource_id", input.resourceId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing.data) return existing.data as { id: string; due_at: string };
  const approval = check(
    await db
      .from("approvals")
      .insert({
        tenant_id: input.tenantId,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        area: input.area,
        priority: draft.priority,
        reason: input.reason,
        requested_by: input.requestedBy,
        due_at: draft.dueAt,
      })
      .select("*")
      .single(),
    "approval_create_failed",
  ) as { id: string; due_at: string };
  await notify(db, { tenantId: input.tenantId, kind: "approval", area: input.area, priority: draft.priority, title: draft.title, body: `${input.reason} (onay ${approval.id})` });
  return approval;
}

export async function openIncident(db: Db, input: { tenantId: string; incident: IncidentDraft; source: string; createdBy: string | null }) {
  const row = check(
    await db
      .from("risk_incidents")
      .insert({
        tenant_id: input.tenantId,
        severity: input.incident.severity,
        categories: input.incident.categories,
        rules: input.incident.rules,
        source: input.source,
        response_steps: input.incident.responseSteps,
        created_by: input.createdBy,
      })
      .select("*")
      .single(),
    "incident_create_failed",
  ) as { id: string };
  await notify(db, {
    tenantId: input.tenantId,
    kind: "alert",
    area: "security",
    priority: input.incident.severity === "critical" ? "urgent" : "high",
    title: "Güvenlik olayı açıldı",
    body: `Kurallar: ${input.incident.rules.join(", ")}`,
  });
  return row;
}
