-- 0006 — Production security hardening.
-- Keep get_tenant_id SECURITY DEFINER because it must read profiles without
-- recursively re-entering the profiles RLS policy. It is not a client API.
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

-- 0002 installed broad idempotency policies; 0003 installed the canonical
-- tenant policy. Remove the redundant pair to avoid multiple permissive paths.
DROP POLICY IF EXISTS idempotency_keys_tenant_read ON public.idempotency_keys;
DROP POLICY IF EXISTS idempotency_keys_tenant_write ON public.idempotency_keys;
