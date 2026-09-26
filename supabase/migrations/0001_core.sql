-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  monthly_limit DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on tenants.id
CREATE INDEX IF NOT EXISTS idx_tenants_id ON tenants(id);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Create indexes on users
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on workflows
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);

-- Steps table
CREATE TABLE IF NOT EXISTS steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  retries INTEGER NOT NULL DEFAULT 0,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on steps
CREATE INDEX IF NOT EXISTS idx_steps_workflow_id ON steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_steps_order ON steps(workflow_id, "order");

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  error TEXT,
  cost_estimate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  cost_actual DECIMAL(10, 2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on checkpoints
CREATE INDEX IF NOT EXISTS idx_checkpoints_task_id ON checkpoints(task_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_step_id ON checkpoints(step_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_task_step ON checkpoints(task_id, step_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id VARCHAR(255) NOT NULL,
  discount_percent DECIMAL(5, 2) NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
  price_cap DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on offers
CREATE INDEX IF NOT EXISTS idx_offers_tenant_id ON offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL DEFAULT 'idle',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on conversations
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes on messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (deny-by-default)
-- For Phase 12 auth, these will enforce tenant isolation

-- Function to get current tenant_id from JWT
CREATE OR REPLACE FUNCTION auth.get_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Tenants RLS: only owner can read/write
CREATE POLICY tenants_own_read ON tenants FOR SELECT
  USING (id = auth.get_tenant_id());

CREATE POLICY tenants_own_write ON tenants FOR INSERT
  WITH CHECK (id = auth.get_tenant_id());

-- Users RLS: tenant isolation
CREATE POLICY users_tenant_read ON users FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY users_tenant_write ON users FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

-- Tasks RLS: tenant isolation
CREATE POLICY tasks_tenant_read ON tasks FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY tasks_tenant_write ON tasks FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

CREATE POLICY tasks_tenant_update ON tasks FOR UPDATE
  USING (tenant_id = auth.get_tenant_id())
  WITH CHECK (tenant_id = auth.get_tenant_id());

CREATE POLICY tasks_tenant_delete ON tasks FOR DELETE
  USING (tenant_id = auth.get_tenant_id());

-- Workflows RLS: tenant isolation
CREATE POLICY workflows_tenant_read ON workflows FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY workflows_tenant_write ON workflows FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

-- Checkpoints RLS: tenant isolation via task
CREATE POLICY checkpoints_tenant_read ON checkpoints FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY checkpoints_tenant_write ON checkpoints FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE tenant_id = auth.get_tenant_id()));

-- Audit logs RLS: tenant isolation
CREATE POLICY audit_logs_tenant_read ON audit_logs FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY audit_logs_tenant_write ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

-- Offers RLS: tenant isolation
CREATE POLICY offers_tenant_read ON offers FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY offers_tenant_write ON offers FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

-- Conversations RLS: tenant isolation
CREATE POLICY conversations_tenant_read ON conversations FOR SELECT
  USING (tenant_id = auth.get_tenant_id());

CREATE POLICY conversations_tenant_write ON conversations FOR INSERT
  WITH CHECK (tenant_id = auth.get_tenant_id());

-- Messages RLS: via conversation's tenant
CREATE POLICY messages_tenant_read ON messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM conversations WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY messages_tenant_write ON messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM conversations WHERE tenant_id = auth.get_tenant_id()));
