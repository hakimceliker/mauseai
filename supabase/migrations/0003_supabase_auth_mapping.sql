-- Map Supabase Auth identities to the existing tenant users table.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);

-- Resolve tenant membership from the authenticated Supabase user instead of
-- requiring an untrusted custom JWT tenant claim.
CREATE OR REPLACE FUNCTION auth.get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

REVOKE ALL ON FUNCTION auth.get_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.get_tenant_id() TO authenticated, service_role;
