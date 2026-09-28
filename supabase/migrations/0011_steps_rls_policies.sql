-- Complete the RLS surface for workflow steps.
-- Steps inherit tenant ownership through their parent workflow.
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY steps_tenant_read ON public.steps FOR SELECT
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY steps_tenant_write ON public.steps FOR INSERT
  WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY steps_tenant_update ON public.steps FOR UPDATE
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = auth.get_tenant_id()))
  WITH CHECK (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = auth.get_tenant_id()));

CREATE POLICY steps_tenant_delete ON public.steps FOR DELETE
  USING (workflow_id IN (SELECT id FROM public.workflows WHERE tenant_id = auth.get_tenant_id()));
