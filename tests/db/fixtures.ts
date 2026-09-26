import type { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";

export interface TenantFixture {
  tenantId: string;
  ownerId: string;
  memberId: string;
  viewerId: string;
}

/** Creates a tenant with an owner, member and viewer profile (as superuser). */
export async function seedTenant(db: PGlite, name: string, monthlyLimit = 1000): Promise<TenantFixture> {
  const tenantId = randomUUID();
  const fx = { tenantId, ownerId: randomUUID(), memberId: randomUUID(), viewerId: randomUUID() };
  await db.query("INSERT INTO tenants (id, name, monthly_limit) VALUES ($1, $2, $3)", [tenantId, name, monthlyLimit]);
  for (const [user, role] of [
    [fx.ownerId, "owner"],
    [fx.memberId, "member"],
    [fx.viewerId, "viewer"],
  ])
    await db.query("INSERT INTO profiles (user_id, tenant_id, role) VALUES ($1, $2, $3)", [user, tenantId, role]);
  return fx;
}

/** One minimal valid row per A–Z table, in foreign-key order. Returns ids by table. */
export async function seedAzRows(db: PGlite, fx: TenantFixture): Promise<Record<string, string>> {
  const t = fx.tenantId;
  const u = fx.ownerId;
  const ids: Record<string, string> = {};
  const ins = async (table: string, sql: string, values: unknown[]) => {
    const res = await db.query<{ id: string }>(`${sql} RETURNING id`, values);
    ids[table] = res.rows[0].id;
  };
  await ins("blueprints", "INSERT INTO blueprints (tenant_id, name, created_by) VALUES ($1, 'bp', $2)", [t, u]);
  await ins("knowledge_sources", "INSERT INTO knowledge_sources (tenant_id, name, kind, owner, review_interval_days, created_by) VALUES ($1, 'ks', 'policy', 'legal', 30, $2)", [t, u]);
  await ins("glossary_terms", "INSERT INTO glossary_terms (tenant_id, term, definition) VALUES ($1, 'SLA', 'Service level')", [t]);
  await ins("feedback", "INSERT INTO feedback (tenant_id, user_id, target_type, target_id, label, label_source) VALUES ($1, $2, 'answer', 'x', 'correct', 'user')", [t, u]);
  await ins("ingestion_sources", "INSERT INTO ingestion_sources (tenant_id, name, kind, owner, schema_version) VALUES ($1, 'src', 'api', 'data', '1.0')", [t]);
  await ins(
    "documents",
    "INSERT INTO documents (tenant_id, source_id, external_id, title, content_type, schema_version, content_hash, raw_content, created_by) VALUES ($1, $2, 'e1', 'doc', 'text/plain', '1.0', 'h', 'body', $3)",
    [t, ids.ingestion_sources, u],
  );
  await ins("document_chunks", "INSERT INTO document_chunks (tenant_id, document_id, chunk_index, content, token_estimate, lineage_hash, created_by) VALUES ($1, $2, 0, 'chunk', 1, 'l', $3)", [t, ids.documents, u]);
  await ins("model_calls", "INSERT INTO model_calls (tenant_id, user_id, origin, provider, mock, ok, latency_ms, outcome) VALUES ($1, $2, 'core', 'mock-gpt', true, true, 100, 'answered')", [t, u]);
  await ins("channel_identities", "INSERT INTO channel_identities (tenant_id, user_id, channel, external_user_id) VALUES ($1, $2, 'api', $3)", [t, u, `ext-${u}`]);
  await ins("channel_messages", "INSERT INTO channel_messages (tenant_id, user_id, channel, context_key, direction, text) VALUES ($1, $2, 'web', 'k', 'inbound', 'merhaba')", [t, u]);
  await ins("flow_templates", `INSERT INTO flow_templates (tenant_id, key, name, version, steps, graph) VALUES ($1, 'tpl', 'Tpl', '1.0.0', '[]', '{}')`, [t]);
  await ins("flow_runs", "INSERT INTO flow_runs (tenant_id, template_key, template_version, goal, created_by) VALUES ($1, 'tpl', '1.0.0', 'g', $2)", [t, u]);
  await ins("approvals", "INSERT INTO approvals (tenant_id, resource_type, resource_id, area, due_at) VALUES ($1, 'flow_run', $2, 'flows', NOW() + interval '1 hour')", [t, ids.flow_runs]);
  await ins("notifications", "INSERT INTO notifications (tenant_id, kind, area, priority, title, body, delivery_status) VALUES ($1, 'task', 'flows', 'normal', 't', 'b', 'delivered_in_app')", [t]);
  await ins("rollouts", "INSERT INTO rollouts (tenant_id, feature_key, version, owner, rollback_plan, runbook_url) VALUES ($1, 'f', '1.0.0', 'ops', 'revert', 'RUNBOOK.md')", [t]);
  await ins("eval_cases", `INSERT INTO eval_cases (tenant_id, key, input, expected) VALUES ($1, 'c1', 'q', '{"mustInclude":[]}')`, [t]);
  await ins("eval_runs", "INSERT INTO eval_runs (tenant_id, label, total, passed, accuracy, p95_latency_ms) VALUES ($1, 'r', 1, 1, 1, 100)", [t]);
  await ins("risk_incidents", "INSERT INTO risk_incidents (tenant_id, severity, categories, rules, source) VALUES ($1, 'high', '{prompt_injection}', '{r1}', 'core')", [t]);
  await ins("decision_records", "INSERT INTO decision_records (tenant_id, title, area, context, decision, consequences) VALUES ($1, 'd', 'core', 'c', 'd', 'c')", [t]);
  await ins("deletion_requests", "INSERT INTO deletion_requests (tenant_id, subject_user_id, reason, scope) VALUES ($1, $2, 'KVKK talebi', '{feedback}')", [t, u]);
  await ins("cost_events", "INSERT INTO cost_events (tenant_id, provider, cost_cents, input_tokens, output_tokens) VALUES ($1, 'mock-gpt', 3, 10, 0)", [t]);
  return ids;
}

export const AZ_TABLES = [
  "blueprints", "knowledge_sources", "glossary_terms", "feedback", "ingestion_sources", "documents", "document_chunks",
  "model_calls", "channel_identities", "channel_messages", "flow_templates", "flow_runs", "approvals", "notifications",
  "rollouts", "eval_cases", "eval_runs", "risk_incidents", "decision_records", "deletion_requests",
] as const;
