-- Complete the remaining foreign-key coverage reported by Supabase.
CREATE INDEX IF NOT EXISTS idx_documents_documents_source_id ON public.documents (source_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_idempotency_keys_step_id ON public.idempotency_keys (step_id);

-- Keep tenant and owner predicates unchanged while allowing Postgres to
-- evaluate stable auth helpers once per statement instead of once per row.
DROP POLICY IF EXISTS knowledge_sources_tenant_read ON public.knowledge_sources;
CREATE POLICY knowledge_sources_tenant_read ON public.knowledge_sources
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS knowledge_sources_tenant_update ON public.knowledge_sources;
CREATE POLICY knowledge_sources_tenant_update ON public.knowledge_sources
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  ) WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS documents_tenant_read ON public.documents;
CREATE POLICY documents_tenant_read ON public.documents
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS documents_tenant_update ON public.documents;
CREATE POLICY documents_tenant_update ON public.documents
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  ) WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS document_chunks_tenant_read ON public.document_chunks;
CREATE POLICY document_chunks_tenant_read ON public.document_chunks
  FOR SELECT USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  );

DROP POLICY IF EXISTS document_chunks_tenant_update ON public.document_chunks;
CREATE POLICY document_chunks_tenant_update ON public.document_chunks
  FOR UPDATE USING (
    tenant_id = get_tenant_id()
    AND ((visibility::text = 'team') OR (created_by = (SELECT auth.uid())))
  ) WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS profiles_tenant_read ON public.profiles;
CREATE POLICY profiles_tenant_read ON public.profiles
  FOR SELECT USING (user_id = (SELECT auth.uid()));
