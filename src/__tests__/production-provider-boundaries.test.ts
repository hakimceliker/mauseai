import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeAI } from '@/src/lib/ai/mock-router';
import { createPaymentAdapter } from '@/src/lib/integrations/payment-adapter';
import { createNotificationAdapter } from '@/src/lib/integrations/notification-provider';
import { createAnalyticsAdapter } from '@/src/lib/integrations/analytics-provider';
import { AIRouter } from '@/src/lib/ai/ai-router';

describe('production provider boundaries', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AI_PROVIDER;
    delete process.env.PAYMENT_PROVIDER_TYPE;
    delete process.env.NOTIFICATION_TYPE;
    delete process.env.ANALYTICS_TYPE;
  });

  it('rejects mock AI routing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.AI_PROVIDER = 'mock';

    await expect(routeAI({ taskId: 'task-1', goal: 'test', riskLevel: 'L1' }))
      .rejects.toThrow('AI_PROVIDER');
  });

  it('rejects direct mock AI router construction in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.AI_PROVIDER = 'mock';

    expect(() => new AIRouter()).toThrow('AI_PROVIDER');
  });

  it('rejects unknown AI providers in production instead of falling back to mock', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.AI_PROVIDER = 'untrusted-provider';

    expect(() => new AIRouter()).toThrow('AI_PROVIDER_UNSUPPORTED:untrusted-provider');
  });

  it('rejects implicit mock payment in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.PAYMENT_PROVIDER_TYPE;

    expect(() => createPaymentAdapter()).toThrow('credential_not_configured:PAYMENT_PROVIDER_TYPE');
  });

  it('rejects unknown payment providers in production instead of falling back to mock', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.PAYMENT_PROVIDER_TYPE = 'untrusted-payment-provider';

    expect(() => createPaymentAdapter()).toThrow(
      'PAYMENT_PROVIDER_UNSUPPORTED:untrusted-payment-provider',
    );
  });

  it('rejects console notification delivery in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NOTIFICATION_TYPE;

    expect(() => createNotificationAdapter()).toThrow('credential_not_configured:NOTIFICATION_TYPE');
  });

  it('rejects console analytics in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.ANALYTICS_TYPE;

    expect(() => createAnalyticsAdapter()).toThrow('credential_not_configured:ANALYTICS_TYPE');
  });
});
