import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { WalletRepository } from '@/src/lib/wallet/wallet-repository';

vi.mock('@/src/lib/db/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

describe('WalletRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts an idempotent ledger entry through the atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ entry_id: 'entry-1', wallet_id: 'wallet-1', available_cents: 5000, held_cents: 0, was_duplicate: false }],
      error: null,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc } as never);

    await expect(WalletRepository.postEntry({
      tenantId: 'tenant-1', entryType: 'credit', amountCents: 5000,
      source: 'stripe', idempotencyKey: 'stripe:event-1', externalId: 'event-1',
    })).resolves.toMatchObject({ entryId: 'entry-1', availableCents: 5000, wasDuplicate: false });
    expect(rpc).toHaveBeenCalledWith('post_wallet_entry', expect.objectContaining({
      p_tenant_id: 'tenant-1', p_entry_type: 'credit', p_amount_cents: 5000,
      p_idempotency_key: 'stripe:event-1',
    }));
  });

  it('returns an actionable error when the RPC fails', async () => {
    vi.mocked(getSupabaseAdmin).mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'INSUFFICIENT_FUNDS' } }) } as never);
    await expect(WalletRepository.postEntry({
      tenantId: 'tenant-1', entryType: 'debit', amountCents: 1,
      source: 'ai_cost', idempotencyKey: 'cost-1',
    })).rejects.toThrow('INSUFFICIENT_FUNDS');
  });
});
