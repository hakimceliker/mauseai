-- 0005: additive tables for external notification delivery (card N, "doğru kişiye,
-- doğru zamanda") and CRM sync (card C, "CRM yüzeyleri"). No existing table,
-- column, policy or event contract is changed.

-- Per-tenant routing: which team receives which channel, from which priority, and when.
CREATE TABLE IF NOT EXISTS notification_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team VARCHAR(20) NOT NULL CHECK (team IN ('product','engineering','data','legal','support')),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email','slack','teams')),
  -- E-mail address for email; a display label for Slack/Teams (the webhook itself is a server secret).
  destination VARCHAR(320) NOT NULL,
  min_priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (min_priority IN ('low','normal','high','urgent')),
  quiet_start_hour SMALLINT CHECK (quiet_start_hour BETWEEN 0 AND 23),
  quiet_end_hour SMALLINT CHECK (quiet_end_hour BETWEEN 0 AND 23),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, team, channel, destination)
);
CREATE INDEX IF NOT EXISTS idx_notification_routes_tenant ON notification_routes(tenant_id, active);

-- One row per (notification, channel, destination): idempotent planning and retry state.
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  route_id UUID REFERENCES notification_routes(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  destination VARCHAR(320) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','deferred','sent','failed','channel_not_configured')),
  not_before TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error VARCHAR(200),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, channel, destination)
);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_due ON notification_deliveries(status, not_before);

-- CRM mapping per tenant: local key → CRM record id, so syncs are idempotent and tenant-scoped.
CREATE TABLE IF NOT EXISTS crm_sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('contact','note')),
  local_key VARCHAR(255) NOT NULL,
  crm_provider VARCHAR(30) NOT NULL,
  crm_id VARCHAR(100) NOT NULL,
  synced_by UUID,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, local_key)
);

-- RLS: tenant members read their tenant's rows. Routes and CRM mappings are written
-- through RBAC-checked routes (insert/update, no delete); deliveries only by the
-- service role (background dispatcher), so no user write policy exists for them.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['notification_routes','notification_deliveries','crm_sync_records'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = public.get_tenant_id())', t || '_tenant_read', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['notification_routes','crm_sync_records'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_write', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_tenant_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id())', t || '_tenant_write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = public.get_tenant_id()) WITH CHECK (tenant_id = public.get_tenant_id())', t || '_tenant_update', t);
  END LOOP;
END $$;
