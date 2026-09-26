-- 0004 — Tables for the A–Z diagram (public/diagrams/masuai-a-z-diyagram.svg).
-- Every table is tenant-scoped with RLS (card I). There are no DELETE policies:
-- user-facing erasure is anonymisation through deletion_requests (card U).

-- Lane 1 — A…F use-case blueprint
CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  current_stage VARCHAR(10) NOT NULL DEFAULT 'A' CHECK (current_stage IN ('A','B','C','D','E','F','complete')),
  stages JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D — domain knowledge
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('glossary','process','policy','document')),
  owner VARCHAR(200) NOT NULL,
  review_interval_days INTEGER NOT NULL CHECK (review_interval_days BETWEEN 1 AND 365),
  last_reviewed_at TIMESTAMPTZ,
  description TEXT,
  visibility VARCHAR(10) NOT NULL DEFAULT 'team' CHECK (visibility IN ('personal','team')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  term VARCHAR(120) NOT NULL,
  definition TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_glossary_terms_tenant_term ON glossary_terms(tenant_id, lower(term));

-- F — feedback loop and improvement queue
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('answer','task','flow_run')),
  target_id VARCHAR(255) NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  label VARCHAR(20) NOT NULL,
  label_source VARCHAR(10) NOT NULL CHECK (label_source IN ('user','rule')),
  comment TEXT,
  question TEXT,
  queue_status VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (queue_status IN ('none','new','triaged','in_progress','done','rejected')),
  queue_priority VARCHAR(2) CHECK (queue_priority IN ('p1','p2','p3')),
  queue_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feedback_queue ON feedback(tenant_id, queue_status, queue_priority);

-- Lane 2 — G ingestion and H preparation
CREATE TABLE IF NOT EXISTS ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('file','api','webhook','document','event_stream')),
  owner VARCHAR(200) NOT NULL,
  schema_version VARCHAR(20) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES ingestion_sources(id) ON DELETE CASCADE,
  external_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  schema_version VARCHAR(20) NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  raw_content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received','ready','rejected')),
  quality_gates JSONB NOT NULL DEFAULT '[]',
  pii_found JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  visibility VARCHAR(10) NOT NULL DEFAULT 'team' CHECK (visibility IN ('personal','team')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prepared_at TIMESTAMPTZ
);
-- Idempotent ingestion: the same content from the same source/external id is stored once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_idempotent ON documents(tenant_id, source_id, external_id, content_hash);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_estimate INTEGER NOT NULL,
  lineage_hash VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  visibility VARCHAR(10) NOT NULL DEFAULT 'team' CHECK (visibility IN ('personal','team')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tenant ON document_chunks(tenant_id);

-- CORE / S — every model call, for SLO, cost and fallback reporting
CREATE TABLE IF NOT EXISTS model_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  origin VARCHAR(20) NOT NULL CHECK (origin IN ('core','flow','eval')),
  provider VARCHAR(50) NOT NULL,
  mock BOOLEAN NOT NULL,
  ok BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  outcome VARCHAR(20) NOT NULL,
  question TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_model_calls_tenant_created ON model_calls(tenant_id, created_at);

-- Lane 3 — O omnichannel identity and context
CREATE TABLE IF NOT EXISTS channel_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel VARCHAR(20) NOT NULL,
  external_user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, channel, external_user_id)
);

CREATE TABLE IF NOT EXISTS channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  channel VARCHAR(20) NOT NULL,
  context_key VARCHAR(100) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
  text TEXT NOT NULL,
  data_class VARCHAR(30) NOT NULL DEFAULT 'personal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_messages_context ON channel_messages(tenant_id, context_key, created_at);

-- M — modular flows
CREATE TABLE IF NOT EXISTS flow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR(60) NOT NULL,
  name VARCHAR(200) NOT NULL,
  version VARCHAR(20) NOT NULL,
  steps JSONB NOT NULL,
  graph JSONB NOT NULL,
  cloned_from VARCHAR(80),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key, version)
);

CREATE TABLE IF NOT EXISTS flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key VARCHAR(60) NOT NULL,
  template_version VARCHAR(20) NOT NULL,
  goal TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','waiting_approval','completed','failed','cancelled')),
  cursor INTEGER NOT NULL DEFAULT 0,
  outputs JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  idempotency_key VARCHAR(200),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_flow_runs_idempotency ON flow_runs(tenant_id, idempotency_key);

-- N — approvals and notifications
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type VARCHAR(30) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  area VARCHAR(30) NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reason TEXT,
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ NOT NULL,
  escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approvals_pending ON approvals(tenant_id, status, due_at);
-- One open approval per resource.
CREATE UNIQUE INDEX IF NOT EXISTS uq_approvals_open_resource ON approvals(tenant_id, resource_type, resource_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('task','alert','digest','approval','sla')),
  area VARCHAR(30) NOT NULL,
  priority VARCHAR(10) NOT NULL,
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  recipient_teams TEXT[] NOT NULL DEFAULT '{}',
  channel VARCHAR(20) NOT NULL DEFAULT 'web',
  delivery_status VARCHAR(40) NOT NULL,
  due_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, read_at, created_at);

-- P — pilot → production rollouts
CREATE TABLE IF NOT EXISTS rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(80) NOT NULL,
  version VARCHAR(20) NOT NULL,
  stage VARCHAR(20) NOT NULL DEFAULT 'pilot' CHECK (stage IN ('pilot','beta','ga','rolled_back')),
  owner VARCHAR(200) NOT NULL,
  rollback_plan TEXT NOT NULL,
  runbook_url TEXT NOT NULL,
  allowlist TEXT[] NOT NULL DEFAULT '{}',
  gate_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, feature_key, version)
);

-- Lane 4 — Q evaluation
CREATE TABLE IF NOT EXISTS eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR(80) NOT NULL,
  input TEXT NOT NULL,
  expected JSONB NOT NULL,
  origin VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual','feedback')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  accuracy NUMERIC(5,4) NOT NULL,
  p95_latency_ms INTEGER NOT NULL,
  usefulness NUMERIC(5,4),
  regression BOOLEAN NOT NULL DEFAULT FALSE,
  baseline_run_id UUID REFERENCES eval_runs(id),
  scores JSONB NOT NULL DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- R — risk incidents
CREATE TABLE IF NOT EXISTS risk_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  categories TEXT[] NOT NULL,
  rules TEXT[] NOT NULL,
  source VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigated','closed')),
  response_steps JSONB NOT NULL DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- T — decision records
CREATE TABLE IF NOT EXISTS decision_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  area VARCHAR(30) NOT NULL,
  context TEXT NOT NULL,
  decision TEXT NOT NULL,
  consequences TEXT NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','superseded')),
  supersedes UUID REFERENCES decision_records(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- U — KVKK deletion (anonymisation) requests
CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  scope TEXT[] NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(12) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','completed')),
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: tenant isolation on every table above (read/insert/update, no delete).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'blueprints','glossary_terms','feedback','ingestion_sources','model_calls',
    'channel_identities','channel_messages','flow_templates','flow_runs','approvals','notifications',
    'rollouts','eval_cases','eval_runs','risk_incidents','decision_records','deletion_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_write', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = auth.get_tenant_id())', t || '_tenant_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = auth.get_tenant_id())', t || '_tenant_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = auth.get_tenant_id()) WITH CHECK (tenant_id = auth.get_tenant_id())', t || '_tenant_update', t);
  END LOOP;

  -- K: personal items are visible to their creator only; team items to the tenant.
  FOREACH t IN ARRAY ARRAY['knowledge_sources','documents','document_chunks'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_write', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = auth.get_tenant_id() AND (visibility = ''team'' OR created_by = auth.uid()))', t || '_tenant_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = auth.get_tenant_id())', t || '_tenant_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = auth.get_tenant_id() AND (visibility = ''team'' OR created_by = auth.uid())) WITH CHECK (tenant_id = auth.get_tenant_id())', t || '_tenant_update', t);
  END LOOP;
END $$;

-- Realtime (N): stream notification inserts to subscribed clients when the publication exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE notifications';
  END IF;
END $$;
