import { getSupabaseAdmin } from '@/src/lib/db/supabase';

export type WalletEntryType = 'credit' | 'debit' | 'hold' | 'release' | 'refund';

export interface WalletBalance {
  walletId: string;
  tenantId: string;
  currency: string;
  availableCents: number;
  heldCents: number;
}

export interface WalletEntryResult extends WalletBalance {
  entryId: string;
  wasDuplicate: boolean;
}

export class WalletRepository {
  static async getBalance(tenantId: string): Promise<WalletBalance | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('wallets')
      .select('id, tenant_id, currency, available_cents, held_cents')
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error) throw new Error(`Failed to get wallet: ${error.message}`);
    if (!data) return null;
    return this.formatBalance(data);
  }

  static async postEntry(input: {
    tenantId: string;
    entryType: WalletEntryType;
    amountCents: number;
    source: string;
    idempotencyKey: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<WalletEntryResult> {
    const { data, error } = await getSupabaseAdmin().rpc('post_wallet_entry', {
      p_tenant_id: input.tenantId,
      p_entry_type: input.entryType,
      p_amount_cents: input.amountCents,
      p_source: input.source,
      p_idempotency_key: input.idempotencyKey,
      p_external_id: input.externalId ?? null,
      p_metadata: input.metadata ?? {},
    });
    if (error) throw new Error(`Failed to post wallet entry: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Failed to post wallet entry: empty response');
    return {
      entryId: String(row.entry_id),
      walletId: String(row.wallet_id),
      tenantId: input.tenantId,
      currency: 'USD',
      availableCents: Number(row.available_cents),
      heldCents: Number(row.held_cents),
      wasDuplicate: Boolean(row.was_duplicate),
    };
  }

  private static formatBalance(data: Record<string, unknown>): WalletBalance {
    return {
      walletId: String(data.id),
      tenantId: String(data.tenant_id),
      currency: String(data.currency),
      availableCents: Number(data.available_cents),
      heldCents: Number(data.held_cents),
    };
  }
}
