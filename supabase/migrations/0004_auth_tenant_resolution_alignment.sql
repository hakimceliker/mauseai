-- Align production tenant resolution with the Supabase role permissions.
-- The public resolver is used by the existing RLS policies; changing the
-- auth schema is not available to the managed migration role.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (
    SELECT u.tenant_id
    FROM public.users u
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO anon, authenticated, service_role;
