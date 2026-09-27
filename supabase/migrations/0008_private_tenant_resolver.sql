-- Keep the privileged tenant lookup out of the PostgREST-exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.get_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.tenant_id
  FROM public.users AS u
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION private.get_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_tenant_id() TO authenticated, service_role;

-- Public wrapper is invoker-only; it does not carry elevated privileges.
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, private
AS $$
  SELECT private.get_tenant_id()
$$;

REVOKE ALL ON FUNCTION public.get_tenant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated, service_role;
