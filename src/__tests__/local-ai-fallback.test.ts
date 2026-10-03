import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeAI } from '@/src/lib/ai/mock-router';
import { AIRouter } from '@/src/lib/ai/ai-router';
import { LocalOllamaProvider } from '@/src/lib/ai/providers/local-ollama';

const messages = [{ role: 'user' as const, content: 'safe test prompt' }];

describe('local-first AI routing', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
  });

  it('uses the private local gateway and records local tokens at zero API cost', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    vi.stubEnv('NODE_ENV', 'production');
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    process.env.LOCAL_AI_ACCESS_CLIENT_ID = 'test-client-id';
    process.env.LOCAL_AI_ACCESS_CLIENT_SECRET = 'test-client-secret';

    const fetchMock = vi.fn().mockImplementation((input: URL | string, _init?: RequestInit) => {
      if (String(input).endsWith('/api/tags')) {
        return Promise.resolve(new Response('', { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: 'local response' } }],
        usage: { prompt_tokens: 3, completion_tokens: 2 },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await routeAI({ taskId: 'task-1', goal: 'safe test prompt', riskLevel: 'L1' });

    expect(response.provider).toBe('local');
    expect(response.output.response).toBe('local response');
    expect(response.inputTokens).toBe(3);
    expect(response.outputTokens).toBe(2);
    expect(response.costCents).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL('https://local-gateway.test/api/tags'));
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      'CF-Access-Client-Id': 'test-client-id',
      'CF-Access-Client-Secret': 'test-client-secret',
    });
    expect(fetchMock.mock.calls[0]?.[1]?.redirect).toBe('error');
    expect(fetchMock.mock.calls[1]?.[1]?.redirect).toBe('error');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://local-gateway.test/v1/chat/completions');
  });

  it('does not let a port-8080 heuristic override explicit Ollama protocol', async () => {
    process.env.LOCAL_AI_BASE_URL = 'http://ollama.test:8080';
    process.env.LOCAL_AI_PROTOCOL = 'ollama';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        response: 'ollama response',
        usage: { input_tokens: 2, output_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new LocalOllamaProvider().call(messages);

    expect(response.content).toBe('ollama response');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://ollama.test:8080/v1/chat/completions');
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({
      model: 'qwen3:8b',
      stream: false,
    });
  });

  it('preserves unavailable provider usage and cost as null', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'false';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'usage unavailable' } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await routeAI({ taskId: 'task-unknown-usage', goal: 'safe test prompt', riskLevel: 'L1' });

    expect(response.inputTokens).toBeNull();
    expect(response.outputTokens).toBeNull();
    expect(response.costCents).toBeNull();
  });

  it('falls back to the cloud provider when local access or inference fails', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
        usage: { prompt_tokens: 4, completion_tokens: 3 },
      }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(response.content).toBe('cloud response');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL('https://local-gateway.test/api/tags'));
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://local-gateway.test/v1/chat/completions');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('uses cloud directly when local routing is disabled', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'false';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'cloud-only response' } }],
      usage: { prompt_tokens: 2, completion_tokens: 1 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('does not send local requests from production to an insecure endpoint', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.LOCAL_AI_BASE_URL = 'http://127.0.0.1:11434';
    process.env.LOCAL_AI_ACCESS_CLIENT_ID = '';
    process.env.LOCAL_AI_ACCESS_CLIENT_SECRET = '';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(new LocalOllamaProvider().call(messages))
      .rejects.toThrow('production_requires_https_and_access_service_token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
