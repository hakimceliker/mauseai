import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { planRecentNotifications, sendDueDeliveries } from "@/src/server/az/notification-dispatch";
import { recordTeamToolMessage } from "@/src/server/az/team-inbound";
import { syncContact } from "@/src/server/az/crm-service";
import { CrmError, type CrmAdapter } from "@/src/lib/crm/crm-adapter";
import type { OutboundMessage } from "@/src/lib/notifications/senders";
import { asUser, createMigratedDb } from "./harness";
import { seedTenant, type TenantFixture } from "./fixtures";
import { asClient, PgClient } from "./pg-client";

/**
 * Migration 0005 on a real Postgres: delivery planning/sending, CRM mapping
 * and inbound team-tool messages, with RLS on the new tables.
 */
describe("notification delivery, CRM sync and team inbound (0005)", () => {
  let db: PGlite;
  let t: TenantFixture;
  let other: TenantFixture;
  let admin: PgClient;
  let owner: PgClient;

  const NOON = new Date("2026-09-26T09:00:00Z"); // 12:00 Europe/Istanbul
  const SLACK_ENV = { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T/B/X" };

  const notify = async (tenantId: string, priority = "normal", teams = "{engineering}") =>
    (
      await db.query<{ id: string }>(
        `INSERT INTO notifications (tenant_id, kind, area, priority, title, body, recipient_teams, delivery_status, created_at)
         VALUES ($1, 'task', 'flows', $2, 'Onay bekliyor', 'Akış onayı gerekli', $3, 'delivered_in_app', $4) RETURNING id`,
        [tenantId, priority, teams, NOON.toISOString()],
      )
    ).rows[0].id;

  const deliveries = async (notificationId: string) =>
    (
      await db.query<{ channel: string; destination: string; status: string; attempts: number; last_error: string | null }>(
        "SELECT channel, destination, status, attempts, last_error FROM notification_deliveries WHERE notification_id = $1 ORDER BY channel",
        [notificationId],
      )
    ).rows;

  beforeAll(async () => {
    db = await createMigratedDb();
    t = await seedTenant(db, "Acme");
    other = await seedTenant(db, "Other");
    admin = asClient(db);
    owner = asClient(db, { sub: t.ownerId });
    await db.query(
      `INSERT INTO notification_routes (tenant_id, team, channel, destination, quiet_start_hour, quiet_end_hour)
       VALUES ($1, 'engineering', 'slack', '#ops', 22, 8), ($1, 'engineering', 'teams', 'Ops kanalı', NULL, NULL),
              ($2, 'engineering', 'slack', '#other-tenant', NULL, NULL)`,
      [t.tenantId, other.tenantId],
    );
  }, 60_000);

  it("plans deliveries idempotently, per tenant, marking unconfigured channels", async () => {
    const id = await notify(t.tenantId);
    const first = await planRecentNotifications(admin, { now: NOON, env: SLACK_ENV });
    expect(first.planned).toBe(2);
    await planRecentNotifications(admin, { now: NOON, env: SLACK_ENV });
    const rows = await deliveries(id);
    expect(rows).toEqual([
      expect.objectContaining({ channel: "slack", destination: "#ops", status: "pending" }),
      expect.objectContaining({ channel: "teams", status: "channel_not_configured" }),
    ]);
    // The other tenant's route was never used for this notification.
    expect(rows.some((r) => r.destination === "#other-tenant")).toBe(false);
  });

  it("sends due deliveries once and records the result", async () => {
    const sent: OutboundMessage[] = [];
    const summary = await sendDueDeliveries(admin, { now: NOON, env: SLACK_ENV, senders: { slack: async (m) => (sent.push(m), { providerMessageId: null }) } });
    expect(summary.sent).toBeGreaterThanOrEqual(1);
    expect(sent[0]).toMatchObject({ destination: "#ops", title: "Onay bekliyor", kind: "task" });
    const again = await sendDueDeliveries(admin, { now: NOON, env: SLACK_ENV, senders: { slack: async () => ({ providerMessageId: null }) } });
    expect(again.sent).toBe(0);
  });

  it("retries with backoff, then fails after 5 attempts and audits it", async () => {
    await db.query("UPDATE notification_routes SET active = FALSE WHERE channel = 'teams'");
    const id = await notify(t.tenantId, "high");
    await planRecentNotifications(admin, { now: NOON, env: SLACK_ENV });
    const boom = async () => {
      throw new Error("upstream 500 at https://hooks.slack.com/services/T/B/X");
    };
    let now = NOON;
    for (let i = 0; i < 5; i++) {
      await sendDueDeliveries(admin, { now, env: SLACK_ENV, senders: { slack: boom } });
      now = new Date(now.getTime() + 30 * 60_000);
    }
    const [row] = await deliveries(id);
    expect(row).toMatchObject({ status: "failed", attempts: 5 });
    expect(row.last_error).not.toContain("T/B/X");
    const audits = await db.query("SELECT 1 FROM audit_logs WHERE action = 'notification.delivery_failed' AND resource_id = $1", [id]);
    expect(audits.rows).toHaveLength(1);
  });

  it("marks due deliveries channel_not_configured when the secret is removed", async () => {
    const id = await notify(t.tenantId);
    await planRecentNotifications(admin, { now: NOON, env: SLACK_ENV });
    const summary = await sendDueDeliveries(admin, { now: NOON, env: {} });
    expect(summary.notConfigured).toBeGreaterThanOrEqual(1);
    expect((await deliveries(id))[0].status).toBe("channel_not_configured");
  });

  it("RLS: tenants read only their own routes and deliveries, and users cannot write deliveries", async () => {
    const own = await asUser(db, { sub: t.memberId }, (tx) => tx.query<{ destination: string }>("SELECT destination FROM notification_routes"));
    expect(own.rows.map((r) => r.destination)).not.toContain("#other-tenant");
    const foreign = await asUser(db, { sub: other.ownerId }, (tx) => tx.query("SELECT 1 FROM notification_deliveries"));
    expect(foreign.rows).toHaveLength(0);
    const nid = await notify(t.tenantId);
    await expect(
      asUser(db, { sub: t.ownerId }, (tx) =>
        tx.query("INSERT INTO notification_deliveries (tenant_id, notification_id, channel, destination) VALUES ($1, $2, 'slack', '#x')", [t.tenantId, nid]),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(db, { sub: t.ownerId }, (tx) =>
        tx.query("INSERT INTO notification_routes (tenant_id, team, channel, destination) VALUES ($1, 'legal', 'slack', '#spoof')", [other.tenantId]),
      ),
    ).rejects.toThrow();
  });

  it("CRM: maps the contact per tenant, audits the domain only, and stays idempotent", async () => {
    const adapter: CrmAdapter = {
      provider: "hubspot",
      upsertContact: async () => ({ crmId: "901" }),
      addNote: async () => ({ crmId: "n1" }),
    };
    const contact = { email: "ada@example.com", firstName: "Ada" };
    const result = await syncContact(owner, admin, { tenantId: t.tenantId, userId: t.ownerId, contact, note: "Demo talebi" }, adapter);
    expect(result).toEqual({ provider: "hubspot", crmId: "901", noteId: "n1" });
    await syncContact(owner, admin, { tenantId: t.tenantId, userId: t.ownerId, contact }, adapter);
    const mapping = await db.query("SELECT crm_id FROM crm_sync_records WHERE tenant_id = $1 AND local_key = 'ada@example.com'", [t.tenantId]);
    expect(mapping.rows).toEqual([{ crm_id: "901" }]);
    const audit = await db.query<{ payload: Record<string, unknown> }>(
      "SELECT payload FROM audit_logs WHERE action = 'crm.contact_synced' AND tenant_id = $1 ORDER BY created_at LIMIT 1",
      [t.tenantId],
    );
    expect(audit.rows[0].payload).toMatchObject({ provider: "hubspot", domain: "example.com", note: true });
    expect(JSON.stringify(audit.rows[0].payload)).not.toContain("ada@");
    const foreign = await asUser(db, { sub: other.ownerId }, (tx) => tx.query("SELECT 1 FROM crm_sync_records"));
    expect(foreign.rows).toHaveLength(0);
  });

  it("CRM: a record owned by another tenant is refused (409) and audited as failed", async () => {
    const adapter: CrmAdapter = {
      provider: "hubspot",
      upsertContact: async () => {
        throw new CrmError("crm_record_owned_by_other_tenant", 409);
      },
      addNote: async () => ({ crmId: "x" }),
    };
    const error = await syncContact(owner, admin, { tenantId: t.tenantId, userId: t.ownerId, contact: { email: "taken@example.com" } }, adapter).catch((e) => e);
    expect(error).toMatchObject({ code: "crm_record_owned_by_other_tenant", status: 409 });
    const failed = await db.query("SELECT 1 FROM audit_logs WHERE action = 'crm.sync_failed' AND tenant_id = $1", [t.tenantId]);
    expect(failed.rows).toHaveLength(1);
  });

  it("team inbound: resolves the tenant from a linked identity only", async () => {
    await db.query("INSERT INTO channel_identities (tenant_id, user_id, channel, external_user_id) VALUES ($1, $2, 'slack', 'U-ACME')", [t.tenantId, t.memberId]);
    const recorded = await recordTeamToolMessage(admin, { channel: "slack", externalUserId: "U-ACME", text: "Bugünkü onaylar?" });
    expect(recorded).toEqual({ status: "recorded", tenantId: t.tenantId, userId: t.memberId, contextKey: `${t.tenantId}:${t.memberId}` });
    const stored = await db.query("SELECT channel, direction FROM channel_messages WHERE tenant_id = $1 AND channel = 'slack'", [t.tenantId]);
    expect(stored.rows).toEqual([{ channel: "slack", direction: "inbound" }]);

    expect(await recordTeamToolMessage(admin, { channel: "slack", externalUserId: "U-UNKNOWN", text: "x" })).toEqual({ status: "identity_not_linked" });

    await db.query(
      "INSERT INTO channel_identities (tenant_id, user_id, channel, external_user_id) VALUES ($1, $2, 'teams', 'shared'), ($3, $4, 'teams', 'shared')",
      [t.tenantId, t.memberId, other.tenantId, other.memberId],
    );
    expect(await recordTeamToolMessage(admin, { channel: "teams", externalUserId: "shared", text: "x" })).toEqual({ status: "identity_ambiguous" });
  });
});
