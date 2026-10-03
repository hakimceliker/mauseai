-- Central invitation contract: reversible member invites are separate from
-- privileged role/access activation. Raw invitation tokens are never stored.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20);

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_users_tenant_role
  ON public.users(tenant_id, role);

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email VARCHAR(320) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  token_hash TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  accepted_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT invitations_role_check CHECK (role = 'member'),
  CONSTRAINT invitations_status_check CHECK (status IN ('sent', 'accepted', 'revoked', 'expired', 'blocked'))
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status
  ON public.invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email
  ON public.invitations(tenant_id, email);

CREATE TABLE IF NOT EXISTS public.privilege_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  requested_role VARCHAR(20) NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'second_approval_required',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP,
  CONSTRAINT privilege_approvals_role_check CHECK (requested_role IN ('owner', 'admin')),
  CONSTRAINT privilege_approvals_status_check CHECK (status IN ('second_approval_required', 'approved', 'rejected')),
  CONSTRAINT privilege_approvals_distinct_approver CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

CREATE INDEX IF NOT EXISTS idx_privilege_approvals_tenant_status
  ON public.privilege_approvals(tenant_id, status);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privilege_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_tenant_read ON public.invitations;
CREATE POLICY invitations_tenant_read ON public.invitations FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS invitations_tenant_write ON public.invitations;
CREATE POLICY invitations_tenant_write ON public.invitations FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS privilege_approvals_tenant_read ON public.privilege_approvals;
CREATE POLICY privilege_approvals_tenant_read ON public.privilege_approvals FOR SELECT
  USING (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS privilege_approvals_tenant_write ON public.privilege_approvals;
CREATE POLICY privilege_approvals_tenant_write ON public.privilege_approvals FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));

DROP POLICY IF EXISTS privilege_approvals_tenant_update ON public.privilege_approvals;
CREATE POLICY privilege_approvals_tenant_update ON public.privilege_approvals FOR UPDATE
  USING (tenant_id = (SELECT public.get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.get_tenant_id()));
