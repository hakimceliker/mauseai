-- 0003 — Reconcile the schema with the code that is actually served.
--
-- The task API (app/api/tasks), the Inngest worker (src/inngest/functions/task-worker.ts)
-- and the server services write columns and tables that 0001/0002 never created
-- (profiles, cost_events, tasks.goal/risk_level/spent_cents, steps.status, …).
-- Everything here is additive: columns are added, NOT NULL constraints the code
-- cannot satisfy are relaxed, and no row or column is dropped.

-- Tenant resolution: JWT claim first, then the caller's profile. SECURITY DEFINER so the
-- lookup is not itself filtered by the profiles RLS policy (no recursion).
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claim TEXT := auth.jwt() ->> 'tenant_id';
BEGIN
  IF claim IS NOT NULL AND claim <> '' THEN
    RETURN claim::UUID;
  END IF;
  RETURN (SELECT p.tenant_id FROM public.profiles p WHERE p.user_id = auth.uid());
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_tenant_read ON profiles;
CREATE POLICY profiles_tenant_read ON profiles FOR SELECT
  USING (user_id = auth.uid() OR tenant_id = public.get_tenant_id());

-- tasks: columns used by createTask / cost-service / continue route
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS risk_level VARCHAR(4) NOT NULL DEFAULT 'L2';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS budget_limit_cents INTEGER CHECK (budget_limit_cents IS NULL OR budget_limit_cents > 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_step_id UUID;
-- The API creates the task before its workflow and identifies the user by created_by.
ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN workflow_id DROP NOT NULL;

-- workflows: per-task graph, as inserted by POST /api/tasks
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS graph JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_workflows_task_id ON workflows(task_id);
DROP POLICY IF EXISTS workflows_tenant_update ON workflows;
CREATE POLICY workflows_tenant_update ON workflows FOR UPDATE
  USING (tenant_id = public.get_tenant_id()) WITH CHECK (tenant_id = public.get_tenant_id());

-- steps: execution state written by the API and the worker (RLS was enabled with no policy)
ALTER TABLE steps ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS node_id VARCHAR(100);
ALTER TABLE steps ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'pending';
ALTER TABLE steps ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE steps ALTER COLUMN "order" SET DEFAULT 0;
ALTER TABLE steps ALTER COLUMN type SET DEFAULT 'ai_call';
UPDATE steps s SET tenant_id = w.tenant_id FROM workflows w WHERE s.workflow_id = w.id AND s.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_steps_task_id ON steps(task_id);
CREATE INDEX IF NOT EXISTS idx_steps_tenant_id ON steps(tenant_id);
DROP POLICY IF EXISTS steps_tenant_read ON steps;
DROP POLICY IF EXISTS steps_tenant_write ON steps;
DROP POLICY IF EXISTS steps_tenant_update ON steps;
CREATE POLICY steps_tenant_read ON steps FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY steps_tenant_write ON steps FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY steps_tenant_update ON steps FOR UPDATE
  USING (tenant_id = public.get_tenant_id()) WITH CHECK (tenant_id = public.get_tenant_id());

-- checkpoints: versioned, idempotent upsert on (task_id, step_id, version)
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
UPDATE checkpoints c SET tenant_id = t.tenant_id FROM tasks t WHERE c.task_id = t.id AND c.tenant_id IS NULL;
UPDATE checkpoints c SET version = ranked.rn
  FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY task_id, step_id ORDER BY created_at, id) AS rn FROM checkpoints) ranked
  WHERE c.id = ranked.id;
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkpoints_task_step_version ON checkpoints(task_id, step_id, version);

-- audit_logs: the shape written by writeAudit(); legacy columns stay readable
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS task_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS step_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_type VARCHAR(30);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS cost_cents INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS risk_level VARCHAR(4);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE audit_logs ALTER COLUMN entity_type DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN actor DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON audit_logs(task_id);

-- cost_events: written by recordCost() with the service role; tenants can read their own
CREATE TABLE IF NOT EXISTS cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  step_id UUID,
  provider VARCHAR(50) NOT NULL,
  cost_cents INTEGER NOT NULL CHECK (cost_cents >= 0),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_created ON cost_events(tenant_id, created_at);
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cost_events_tenant_read ON cost_events;
CREATE POLICY cost_events_tenant_read ON cost_events FOR SELECT USING (tenant_id = public.get_tenant_id());

-- idempotency_keys: request-level keys (tenant_id, key) used by POST /api/tasks
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS key VARCHAR(255);
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS request_hash VARCHAR(64);
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS status_code INTEGER;
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS response JSONB;
ALTER TABLE idempotency_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE idempotency_keys ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE idempotency_keys ALTER COLUMN step_id DROP NOT NULL;
ALTER TABLE idempotency_keys ALTER COLUMN idempotency_key DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_keys_tenant_key ON idempotency_keys(tenant_id, key);
DROP POLICY IF EXISTS idempotency_keys_request_read ON idempotency_keys;
DROP POLICY IF EXISTS idempotency_keys_request_write ON idempotency_keys;
CREATE POLICY idempotency_keys_request_read ON idempotency_keys FOR SELECT USING (tenant_id = public.get_tenant_id());
CREATE POLICY idempotency_keys_request_write ON idempotency_keys FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
