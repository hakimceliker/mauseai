-- Use the Supabase Auth user-to-tenant mapping for every core RLS policy.
-- This supersedes the earlier JWT tenant_id claim resolver from 0001_core.sql.

DROP POLICY IF EXISTS tenants_own_read ON public.tenants;
CREATE POLICY tenants_own_read ON public.tenants FOR SELECT
  USING (id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS tenants_own_write ON public.tenants;
CREATE POLICY tenants_own_write ON public.tenants FOR INSERT
  WITH CHECK (id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS users_tenant_read ON public.users;
CREATE POLICY users_tenant_read ON public.users FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS users_tenant_write ON public.users;
CREATE POLICY users_tenant_write ON public.users FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS workflows_tenant_read ON public.workflows;
CREATE POLICY workflows_tenant_read ON public.workflows FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS workflows_tenant_write ON public.workflows;
CREATE POLICY workflows_tenant_write ON public.workflows FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS tasks_tenant_read ON public.tasks;
CREATE POLICY tasks_tenant_read ON public.tasks FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS tasks_tenant_write ON public.tasks;
CREATE POLICY tasks_tenant_write ON public.tasks FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS tasks_tenant_update ON public.tasks;
CREATE POLICY tasks_tenant_update ON public.tasks FOR UPDATE
  USING (tenant_id = (SELECT public.get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS tasks_tenant_delete ON public.tasks;
CREATE POLICY tasks_tenant_delete ON public.tasks FOR DELETE
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS steps_tenant_read ON public.steps;
CREATE POLICY steps_tenant_read ON public.steps FOR SELECT
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS steps_tenant_write ON public.steps;
CREATE POLICY steps_tenant_write ON public.steps FOR INSERT
  WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS steps_tenant_update ON public.steps;
CREATE POLICY steps_tenant_update ON public.steps FOR UPDATE
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = (SELECT public.get_tenant_id())))
  WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS steps_tenant_delete ON public.steps;
CREATE POLICY steps_tenant_delete ON public.steps FOR DELETE
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS checkpoints_tenant_read ON public.checkpoints;
CREATE POLICY checkpoints_tenant_read ON public.checkpoints FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS checkpoints_tenant_write ON public.checkpoints;
CREATE POLICY checkpoints_tenant_write ON public.checkpoints FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS audit_logs_tenant_read ON public.audit_logs;
CREATE POLICY audit_logs_tenant_read ON public.audit_logs FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS audit_logs_tenant_write ON public.audit_logs;
CREATE POLICY audit_logs_tenant_write ON public.audit_logs FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS offers_tenant_read ON public.offers;
CREATE POLICY offers_tenant_read ON public.offers FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS offers_tenant_write ON public.offers;
CREATE POLICY offers_tenant_write ON public.offers FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS conversations_tenant_read ON public.conversations;
CREATE POLICY conversations_tenant_read ON public.conversations FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS conversations_tenant_write ON public.conversations;
CREATE POLICY conversations_tenant_write ON public.conversations FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS messages_tenant_read ON public.messages;
CREATE POLICY messages_tenant_read ON public.messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM public.conversations WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS messages_tenant_write ON public.messages;
CREATE POLICY messages_tenant_write ON public.messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM public.conversations WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS idempotency_keys_tenant_read ON public.idempotency_keys;
CREATE POLICY idempotency_keys_tenant_read ON public.idempotency_keys FOR SELECT
  USING (task_id IN (SELECT id FROM public.tasks WHERE tenant_id = (SELECT public.get_tenant_id())));

DROP POLICY IF EXISTS idempotency_keys_tenant_write ON public.idempotency_keys;
CREATE POLICY idempotency_keys_tenant_write ON public.idempotency_keys FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE tenant_id = (SELECT public.get_tenant_id())));
