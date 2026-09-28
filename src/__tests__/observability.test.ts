import { afterEach, describe, expect, it, vi } from 'vitest';
import { LangfuseAdapter, Observability, SentryAdapter, redactTelemetry } from '@/src/lib/observability';

afterEach(() => { vi.restoreAllMocks(); delete process.env.SENTRY_DSN; delete process.env.LANGFUSE_PUBLIC_KEY; delete process.env.LANGFUSE_SECRET_KEY; });

describe('observability adapters', () => {
  it('does not call the network when Sentry is not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await new SentryAdapter().captureException(new Error('test'));
    expect(result.status).toBe('credential_not_configured'); expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('does not call the network when Langfuse is not configured', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await new LangfuseAdapter().trace({ name: 'test', input: { token: 'secret' } });
    expect(result.status).toBe('credential_not_configured'); expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('redacts credentials and email addresses recursively', () => {
    expect(redactTelemetry({ apiKey: 'secret', nested: { email: 'a@example.com' }, text: 'Bearer abc' })).toEqual({ apiKey: '[REDACTED]', nested: { email: '[EMAIL]' }, text: 'Bearer [REDACTED]' });
  });
  it('swallows provider failures and returns a safe status', async () => {
    process.env.SENTRY_DSN = 'https://public@example.com/1';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await new Observability().reportException(new Error('test'), { password: 'never-send' });
    expect(result[0]).toMatchObject({ provider: 'sentry', status: 'error', reason: 'network_error' });
  });
});
