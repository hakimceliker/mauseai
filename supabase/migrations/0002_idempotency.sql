-- Idempotency keys table for duplicate detection
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(255) NOT NULL,
  result JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, step_id, idempotency_key)
);

-- Create indexes on idempotency_keys
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_task_step ON idempotency_keys(task_id, step_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON idempotency_keys(idempotency_key);

-- Enable RLS on idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Idempotency keys RLS: tenant isolation via task
CREATE POLICY idempotency_keys_tenant_read ON idempotency_keys FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY idempotency_keys_tenant_write ON idempotency_keys FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE tenant_id = auth.get_tenant_id()));
