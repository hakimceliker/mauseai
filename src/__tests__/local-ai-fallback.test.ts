import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIRouter } from '@/src/lib/ai/ai-router';
import { LocalOllamaProvider } from '@/src/lib/ai/providers/local-ollama';

const messages = [{ role: 'user' as const, content: 'safe test prompt' }];

describe('local-first AI routing', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
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

  it('rejects an empty local response and records the fallback reason', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: '   ' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
      }), { status: 200 }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(response.content).toBe('cloud response');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://local-gateway.test/chat');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).model).toBe('qwen3:8b');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://api.openai.com/v1/chat/completions');
    const telemetry = info.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
    expect(telemetry).toContainEqual(expect.objectContaining({
      provider: 'openai',
      route: 'CLOUD',
      fallback: true,
      fallback_reason: 'invalid_response',
    }));
  });

  it('redacts malformed gateway response bodies before fallback reporting', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('private gateway error body', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
      }), { status: 200 }));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('private gateway error body');
    const telemetry = info.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
    expect(telemetry).toContainEqual(expect.objectContaining({
      fallback: true,
      fallback_reason: 'invalid_response',
    }));
  });

  it('returns to local after a transient invalid response and emits local model telemetry', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: '' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        response: 'local response',
        model: 'qwen3:8b',
        usage: { input_tokens: 3, output_tokens: 2 },
      }), { status: 200 }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);
    const router = new AIRouter();

    const firstResponse = await router.call(messages);
    const secondResponse = await router.call(messages);

    expect(firstResponse.provider).toBe('openai');
    expect(secondResponse.provider).toBe('local');
    expect(secondResponse.content).toBe('local response');
    expect(secondResponse.model).toBe('qwen3:8b');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://local-gateway.test/chat',
      'https://api.openai.com/v1/chat/completions',
      'https://local-gateway.test/chat',
    ]);
    const telemetry = info.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
    expect(telemetry).toContainEqual(expect.objectContaining({
      provider: 'local',
      route: 'LOCAL',
      model: 'qwen3:8b',
      fallback: false,
    }));
    expect(JSON.stringify(warning.mock.calls)).not.toContain('local-gateway.test');
  });

  it('falls back when the gateway reports a different model', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        response: 'a response from another model',
        model: 'another-model',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
      }), { status: 200 }));
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    const telemetry = info.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
    expect(telemetry).toContainEqual(expect.objectContaining({
      provider: 'openai',
      fallback: true,
      fallback_reason: 'invalid_response',
    }));
  });

  it('requires the gateway to report the requested model', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: 'unverified model' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: 'cloud response' } }],
      }), { status: 200 }));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects direct Ollama and loopback endpoints in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.LOCAL_AI_BASE_URL = 'http://localhost:11434';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(new LocalOllamaProvider().call(messages)).rejects.toThrow('unsafe_endpoint');

    expect(fetchMock).not.toHaveBeenCalled();
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
