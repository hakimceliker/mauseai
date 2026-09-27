-- Map Supabase Auth identities to the existing tenant users table.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
  ON public.users(auth_user_id);

-- Tenant resolution is finalized in 0004 using public.get_tenant_id().
-- Managed Supabase migration roles cannot replace functions in the auth schema.
