-- RPCs exposed through PostgREST must never be callable anonymously.
-- Keep tenant resolution available only to authenticated sessions and workers.
REVOKE ALL ON FUNCTION public.get_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.post_wallet_entry(UUID, VARCHAR, BIGINT, VARCHAR, VARCHAR, VARCHAR, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_wallet_entry(UUID, VARCHAR, BIGINT, VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated, service_role;
