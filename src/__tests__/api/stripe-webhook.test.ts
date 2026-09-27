import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/src/app/api/webhooks/stripe/route';
import { getPaymentAdapter } from '@/src/lib/integrations';
import { WalletRepository } from '@/src/lib/wallet/wallet-repository';

vi.mock('@/src/lib/integrations', () => ({ getPaymentAdapter: vi.fn() }));
vi.mock('@/src/lib/wallet/wallet-repository', () => ({ WalletRepository: { postEntry: vi.fn() } }));

describe('Stripe webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_PROVIDER_TYPE = 'stripe';
    vi.mocked(getPaymentAdapter).mockReturnValue({ verifyWebhookSignature: vi.fn().mockReturnValue(true) } as never);
  });

  it('credits a tenant exactly through the idempotent wallet entry', async () => {
    const body = JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: { amount_received: 2500, metadata: { tenant_id: 'tenant-1' }, currency: 'usd' } } });
    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'valid' }, body }));
    expect(response.status).toBe(200);
    expect(WalletRepository.postEntry).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1', amountCents: 2500, idempotencyKey: 'stripe:evt_1', externalId: 'evt_1' }));
  });

  it('rejects an invalid signature before writing', async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({ verifyWebhookSignature: vi.fn().mockReturnValue(false) } as never);
    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': 'bad' }, body: '{}' }));
    expect(response.status).toBe(400);
    expect(WalletRepository.postEntry).not.toHaveBeenCalled();
  });
});
