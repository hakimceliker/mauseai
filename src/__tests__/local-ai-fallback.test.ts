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
  const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  type Telemetry = { event?: string; route?: string; fallback?: boolean; fallback_reason?: string; provider?: string; model?: string };
  const telemetry = (spy: { mock: { calls: unknown[][] } }): Telemetry[] => spy.mock.calls
    .map((call): Telemetry | undefined => { try { return JSON.parse(String(call[0])) as Telemetry; } catch { return undefined; } })
    .filter((entry): entry is Telemetry => entry?.event === 'ai_provider_selected');

  it('treats an empty local reply as failure and falls back to cloud', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: '   ' } }] }))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: 'cloud response' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('openai');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(telemetry(info)[0]).toMatchObject({ route: 'CLOUD', fallback: true, fallback_reason: 'invalid_response' });
  });

  it('uses the gateway protocol (/chat) when LOCAL_AI_PROTOCOL=gateway', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    process.env.LOCAL_AI_MODEL = 'qwen3:8b';
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(okJson({ response: 'gateway reply' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await new AIRouter().call(messages);

    expect(response.provider).toBe('local');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://local-gateway.test/chat');
    expect(telemetry(info)[0]).toMatchObject({ route: 'LOCAL', provider: 'local', model: 'qwen3:8b', fallback: false });
  });

  it('goes LOCAL -> CLOUD fallback -> LOCAL recovery across requests', async () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-only-placeholder';
    process.env.LOCAL_AI_ENABLED = 'true';
    process.env.LOCAL_AI_PROTOCOL = 'gateway';
    process.env.LOCAL_AI_BASE_URL = 'https://local-gateway.test';
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okJson({ response: 'local one' }))
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockResolvedValueOnce(okJson({ choices: [{ message: { content: 'cloud two' } }] }))
      .mockResolvedValueOnce(okJson({ response: 'local three' }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await new AIRouter().call(messages);
    const second = await new AIRouter().call(messages);
    const third = await new AIRouter().call(messages);

    expect([first.provider, second.provider, third.provider]).toEqual(['local', 'openai', 'local']);
    expect(telemetry(info).map((entry) => entry.route)).toEqual(['LOCAL', 'CLOUD', 'LOCAL']);
    expect(telemetry(info)[1]).toMatchObject({ fallback: true, fallback_reason: 'network_or_timeout' });
  });
});
