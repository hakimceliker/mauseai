-- Wallets and an append-only ledger for tenant credits.
-- All balance changes happen through post_wallet_entry so retries are safe.
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  available_cents BIGINT NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  held_cents BIGINT NOT NULL DEFAULT 0 CHECK (held_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('credit', 'debit', 'hold', 'release', 'refund')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  source VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  external_id VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallet_ledger_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT wallet_ledger_external_id UNIQUE (tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_tenant_created
  ON public.wallet_ledger_entries(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet_created
  ON public.wallet_ledger_entries(wallet_id, created_at DESC);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_tenant_read ON public.wallets;
CREATE POLICY wallets_tenant_read ON public.wallets FOR SELECT
  USING (tenant_id = public.get_tenant_id());

DROP POLICY IF EXISTS wallet_ledger_tenant_read ON public.wallet_ledger_entries;
CREATE POLICY wallet_ledger_tenant_read ON public.wallet_ledger_entries FOR SELECT
  USING (tenant_id = public.get_tenant_id());

-- The function is the only write path. It supports service-role workers and
-- authenticated users mapped to the same tenant, while remaining atomic.
CREATE OR REPLACE FUNCTION public.post_wallet_entry(
  p_tenant_id UUID,
  p_entry_type VARCHAR,
  p_amount_cents BIGINT,
  p_source VARCHAR,
  p_idempotency_key VARCHAR,
  p_external_id VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  entry_id UUID,
  wallet_id UUID,
  available_cents BIGINT,
  held_cents BIGINT,
  was_duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_entry public.wallet_ledger_entries;
  v_is_service_role BOOLEAN := COALESCE(auth.role() = 'service_role', false);
BEGIN
  IF NOT v_is_service_role AND public.get_tenant_id() IS DISTINCT FROM p_tenant_id THEN
    RAISE EXCEPTION 'TENANT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_entry_type NOT IN ('credit', 'debit', 'hold', 'release', 'refund') THEN
    RAISE EXCEPTION 'INVALID_ENTRY_TYPE';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF NULLIF(trim(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  INSERT INTO public.wallets (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT * INTO v_wallet FROM public.wallets WHERE tenant_id = p_tenant_id FOR UPDATE;

  SELECT * INTO v_entry
  FROM public.wallet_ledger_entries
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;
  IF v_entry.id IS NOT NULL THEN
    RETURN QUERY SELECT v_entry.id, v_entry.wallet_id, v_wallet.available_cents, v_wallet.held_cents, true;
    RETURN;
  END IF;

  IF p_entry_type IN ('debit', 'hold') AND v_wallet.available_cents < p_amount_cents THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
  END IF;
  IF p_entry_type = 'release' AND v_wallet.held_cents < p_amount_cents THEN
    RAISE EXCEPTION 'INSUFFICIENT_HELD_FUNDS';
  END IF;

  INSERT INTO public.wallet_ledger_entries (tenant_id, wallet_id, entry_type, amount_cents, source, idempotency_key, external_id, metadata)
  VALUES (p_tenant_id, v_wallet.id, p_entry_type, p_amount_cents, p_source, p_idempotency_key, p_external_id, COALESCE(p_metadata, '{}'))
  RETURNING * INTO v_entry;

  UPDATE public.wallets
  SET available_cents = CASE
        WHEN p_entry_type IN ('credit', 'refund', 'release') THEN available_cents + p_amount_cents
        WHEN p_entry_type IN ('debit', 'hold') THEN available_cents - p_amount_cents
        ELSE available_cents END,
      held_cents = CASE
        WHEN p_entry_type = 'hold' THEN held_cents + p_amount_cents
        WHEN p_entry_type = 'release' THEN held_cents - p_amount_cents
        ELSE held_cents END,
      updated_at = NOW()
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  RETURN QUERY SELECT v_entry.id, v_wallet.id, v_wallet.available_cents, v_wallet.held_cents, false;
END;
$$;

REVOKE ALL ON FUNCTION public.post_wallet_entry(UUID, VARCHAR, BIGINT, VARCHAR, VARCHAR, VARCHAR, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_wallet_entry(UUID, VARCHAR, BIGINT, VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated, service_role;
