-- 0008 — Remove SECURITY DEFINER from the tenant resolver.
-- The function only needs the JWT tenant claim or the current user's own profile.
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY INVOKER
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

DROP POLICY IF EXISTS profiles_tenant_read ON public.profiles;
CREATE POLICY profiles_tenant_read ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

REVOKE EXECUTE ON FUNCTION public.get_tenant_id() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.get_tenant_id() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO service_role;
  END IF;
END
$$;
