import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { createMigratedDb } from "./harness";
import { AZ_TABLES, seedAzRows, seedTenant, type TenantFixture } from "./fixtures";
import { asClient } from "./pg-client";

/** Card I (tenant boundaries) and K (personal vs team space) enforced by Postgres RLS, not app code. */
describe("A–Z tables: tenant isolation through RLS", () => {
  let db: PGlite;
  let a: TenantFixture;
  let b: TenantFixture;
  let bIds: Record<string, string>;

  beforeAll(async () => {
    db = await createMigratedDb();
    a = await seedTenant(db, "Tenant A");
    b = await seedTenant(db, "Tenant B");
    await seedAzRows(db, a);
    bIds = await seedAzRows(db, b);
  }, 60_000);

  it.each(AZ_TABLES)("%s: tenant A sees only its own rows", async (table) => {
    const res = await asClient(db, { sub: a.ownerId }).from(table).select("tenant_id");
    expect(res.error).toBeNull();
    const rows = res.data as Array<{ tenant_id: string }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.tenant_id === a.tenantId)).toBe(true);
  });

  it.each(AZ_TABLES)("%s: tenant A cannot update tenant B rows", async (table) => {
    const res = await asClient(db, { sub: a.ownerId }).from(table).update({ tenant_id: b.tenantId }).eq("id", bIds[table]).select("id");
    expect(res.data ?? []).toHaveLength(0);
  });

  it.each(AZ_TABLES)("%s: no DELETE policy, users cannot remove rows", async (table) => {
    const own = await db.query<{ id: string }>(`SELECT id FROM ${table} WHERE tenant_id = $1 LIMIT 1`, [a.tenantId]);
    const res = await asClient(db, { sub: a.ownerId }).from(table).delete().eq("id", own.rows[0].id);
    expect((res.data as unknown[] | null) ?? []).toHaveLength(0);
    const still = await db.query(`SELECT 1 FROM ${table} WHERE id = $1`, [own.rows[0].id]);
    expect(still.rows).toHaveLength(1);
  });

  it("rejects inserts that claim another tenant", async () => {
    const res = await asClient(db, { sub: a.ownerId })
      .from("feedback")
      .insert({ tenant_id: b.tenantId, target_type: "answer", target_id: "x", label: "correct", label_source: "user" });
    expect(res.error?.message).toMatch(/row-level security/);
  });

  it("cost_events are read-only for users (writes go through the service role)", async () => {
    const read = await asClient(db, { sub: a.ownerId }).from("cost_events").select("tenant_id");
    expect((read.data as Array<{ tenant_id: string }>).every((r) => r.tenant_id === a.tenantId)).toBe(true);
    const write = await asClient(db, { sub: a.ownerId }).from("cost_events").insert({ tenant_id: a.tenantId, provider: "x", cost_cents: 1 });
    expect(write.error).not.toBeNull();
  });

  it("personal documents are visible only to their creator (K: kişisel alan + ekip alanı)", async () => {
    const src = await db.query<{ id: string }>("SELECT id FROM ingestion_sources WHERE tenant_id = $1", [a.tenantId]);
    await db.query(
      "INSERT INTO documents (tenant_id, source_id, external_id, title, content_type, schema_version, content_hash, raw_content, visibility, created_by) VALUES ($1, $2, 'p1', 'private', 'text/plain', '1.0', 'hp', 'secret', 'personal', $3)",
      [a.tenantId, src.rows[0].id, a.memberId],
    );
    const creator = await asClient(db, { sub: a.memberId }).from("documents").select("title").eq("external_id", "p1");
    const colleague = await asClient(db, { sub: a.ownerId }).from("documents").select("title").eq("external_id", "p1");
    expect(creator.data).toHaveLength(1);
    expect(colleague.data).toHaveLength(0);
  });

  it("a user without a profile sees nothing", async () => {
    const res = await asClient(db, { sub: "00000000-0000-4000-8000-000000000001" }).from("blueprints").select("id");
    expect(res.data).toHaveLength(0);
  });
});
