import { afterEach, describe, expect, it, vi } from 'vitest';
import { PostHogAnalyticsProvider } from '@/src/lib/integrations/posthog-provider';

afterEach(() => { vi.restoreAllMocks(); delete process.env.POSTHOG_KEY; });

describe('PostHogAnalyticsProvider', () => {
  it('does not call the network without a credential', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const provider = new PostHogAnalyticsProvider('');
    await provider.trackEvent({ name: 'test', properties: { email: 'private@example.com' } });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await provider.isHealthy()).toBe(false);
  });

  it('allowlists analytics properties and removes tenant and direct PII', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const provider = new PostHogAnalyticsProvider('test-key', 'https://posthog.test');
    await provider.trackEvent({ name: 'task.created', userId: 'user-1', properties: { email: 'private@example.com', name: 'Private', tenantId: 'tenant-1', kind: 'task' } });
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.properties).not.toHaveProperty('email');
    expect(body.properties).not.toHaveProperty('name');
    expect(body.properties).not.toHaveProperty('tenantId');
    expect(body.properties).not.toHaveProperty('kind');
  });

  it('swallows transport failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(new PostHogAnalyticsProvider('test-key').trackPage({ path: '/home' })).resolves.toBeUndefined();
  });
});
