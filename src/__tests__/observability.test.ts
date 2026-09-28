import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIRouter } from '@/src/lib/ai/ai-router';
import { ErrorLogger } from '@/src/lib/logging/error-logger';
import { LangfuseAdapter, Observability, SentryAdapter, observability, redactTelemetry } from '@/src/lib/observability';

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

  it('hooks AI completions and errors without blocking the caller', async () => {
    const traceSpy = vi.spyOn(observability, 'reportTrace').mockResolvedValue([]);
    const errorSpy = vi.spyOn(observability, 'reportException').mockResolvedValue([]);
    process.env.AI_PROVIDER = 'mock';
    await new AIRouter().call([{ role: 'user', content: 'hello' }]);
    ErrorLogger.logError(new Error('expected'), { errorId: 'err-1', requestPath: '/api/tasks' });
    expect(traceSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    delete process.env.AI_PROVIDER;
  });
});
