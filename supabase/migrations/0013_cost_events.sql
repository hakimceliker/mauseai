-- Provider cost ledger for bounded, auditable task execution.
-- The trace key makes repeated workflow delivery idempotent.
CREATE TABLE IF NOT EXISTS public.cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.steps(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  cost_cents INTEGER NOT NULL CHECK (cost_cents >= 0),
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cost_events_task_trace_unique UNIQUE (task_id, trace_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_events_tenant_created
  ON public.cost_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_events_task
  ON public.cost_events (task_id, created_at DESC);

ALTER TABLE public.cost_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_events_tenant_read ON public.cost_events;
CREATE POLICY cost_events_tenant_read ON public.cost_events FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS cost_events_tenant_write ON public.cost_events;
CREATE POLICY cost_events_tenant_write ON public.cost_events FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));
