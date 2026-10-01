import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIRouter } from '@/src/lib/ai/ai-router';

const messages = [{ role: 'user' as const, content: 'safe test prompt' }];

describe('local-first AI routing', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('uses the local gateway when it succeeds', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'local response' } }],
      usage: { prompt_tokens: 3, completion_tokens: 2 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('local');
    expect(response.content).toBe('local response');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://local-gateway.test/v1/chat/completions', expect.any(Object));
  });

  it('falls back to the cloud provider when local access fails', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
        usage: { prompt_tokens: 4, completion_tokens: 3 },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(response.content).toBe('cloud response');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://local-gateway.test/v1/chat/completions');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('uses cloud directly when local routing is disabled', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'false';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'cloud-only response' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/chat/completions');
  });
});
