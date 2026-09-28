import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPaymentAdapter, isLiveStripeCredential } from '@/src/lib/integrations/payment-adapter';

afterEach(() => { vi.restoreAllMocks(); delete process.env.PAYMENT_PROVIDER_TYPE; delete process.env.PAYMENT_API_KEY; });

describe('Stripe sandbox guard', () => {
  it('recognizes live Stripe credentials', () => {
    expect(isLiveStripeCredential('sk_live_example')).toBe(true);
    expect(isLiveStripeCredential('rk_live_example')).toBe(true);
    expect(isLiveStripeCredential('sk_test_example')).toBe(false);
  });
  it('rejects live credentials before provider creation', () => {
    process.env.PAYMENT_PROVIDER_TYPE = 'stripe';
    process.env.PAYMENT_API_KEY = 'sk_live_never-log-this';
    expect(() => createPaymentAdapter()).toThrow('live_mode_not_approved');
  });
});
