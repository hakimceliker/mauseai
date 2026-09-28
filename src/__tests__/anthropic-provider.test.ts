import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  const create = vi.fn();
  const ctor = vi.fn();
  class APIError extends Error {
    readonly status: number | undefined;
    constructor(status: number | undefined, message: string) {
      super(message);
      this.status = status;
    }
  }
  class Anthropic {
    messages = { create };
    constructor(options: unknown) {
      ctor(options);
    }
  }
  return { create, ctor, APIError, Anthropic };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: sdk.Anthropic,
  Anthropic: sdk.Anthropic,
  APIError: sdk.APIError,
}));

import { AnthropicProvider } from '@/src/lib/ai/providers/anthropic';
import { AIProviderError, CredentialNotConfiguredError } from '@/src/lib/ai/providers/base-provider';

const fakeKey = () => ['sk', 'ant', 'test', 'x'.repeat(12)].join('-');

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content: [{ type: 'text', text: 'hello ' }, { type: 'text', text: 'world' }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 1000, output_tokens: 2000 },
    ...overrides,
  };
}

describe('AnthropicProvider (SDK)', () => {
  beforeEach(() => {
    sdk.create.mockReset();
    sdk.ctor.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('throws CredentialNotConfiguredError before creating the client', async () => {
    await expect(new AnthropicProvider('').call([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(CredentialNotConfiguredError);
    expect(sdk.ctor).not.toHaveBeenCalled();
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it('returns text content, usage and default-priced cost', async () => {
    sdk.create.mockResolvedValue(message());
    const key = fakeKey();
    const result = await new AnthropicProvider(key).call([{ role: 'user', content: 'hi' }]);
    expect(result).toEqual({
      role: 'assistant',
      content: 'hello world',
      provider: 'anthropic',
      tokens_used: 3000,
      cost: (1000 * 5 + 2000 * 25) / 1_000_000,
    });
    expect(sdk.ctor).toHaveBeenCalledWith({ apiKey: key, timeout: 25000, maxRetries: 2 });
    expect(JSON.stringify(result)).not.toContain(key);
  });

  it('sends default model/max_tokens and no sampling or enabled-thinking params', async () => {
    sdk.create.mockResolvedValue(message());
    await new AnthropicProvider(fakeKey()).call([{ role: 'user', content: 'hi' }]);
    const params = sdk.create.mock.calls[0][0];
    expect(params).toEqual({ model: 'claude-opus-5', max_tokens: 1024, messages: [{ role: 'user', content: 'hi' }] });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('top_p');
    expect(params).not.toHaveProperty('top_k');
    expect(params).not.toHaveProperty('thinking');
    expect(params).not.toHaveProperty('system');
  });

  it('maps system messages to the top-level system param', async () => {
    sdk.create.mockResolvedValue(message());
    await new AnthropicProvider(fakeKey()).call([
      { role: 'system', content: 'rule one' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'system', content: 'rule two' },
      { role: 'user', content: 'again' },
    ]);
    const params = sdk.create.mock.calls[0][0];
    expect(params.system).toBe('rule one\nrule two');
    expect(params.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'again' },
    ]);
  });

  it('honours env overrides for model, limits, client options, thinking and pricing', async () => {
    vi.stubEnv('ANTHROPIC_MODEL', 'claude-sonnet-5');
    vi.stubEnv('ANTHROPIC_MAX_TOKENS', '4096');
    vi.stubEnv('ANTHROPIC_TIMEOUT_MS', '5000');
    vi.stubEnv('ANTHROPIC_MAX_RETRIES', '0');
    vi.stubEnv('ANTHROPIC_THINKING', 'adaptive');
    vi.stubEnv('ANTHROPIC_PRICE_INPUT_PER_1M', '3');
    vi.stubEnv('ANTHROPIC_PRICE_OUTPUT_PER_1M', '15');
    sdk.create.mockResolvedValue(message());
    const key = fakeKey();
    const result = await new AnthropicProvider(key).call([{ role: 'user', content: 'hi' }]);
    const params = sdk.create.mock.calls[0][0];
    expect(params.model).toBe('claude-sonnet-5');
    expect(params.max_tokens).toBe(4096);
    expect(params.thinking).toEqual({ type: 'adaptive' });
    expect(sdk.ctor).toHaveBeenCalledWith({ apiKey: key, timeout: 5000, maxRetries: 0 });
    expect(result.cost).toBeCloseTo((1000 * 3 + 2000 * 15) / 1_000_000);
  });

  it('ignores invalid numeric env values and non-adaptive thinking values', async () => {
    vi.stubEnv('ANTHROPIC_MAX_TOKENS', 'lots');
    vi.stubEnv('ANTHROPIC_THINKING', 'enabled');
    sdk.create.mockResolvedValue(message());
    await new AnthropicProvider(fakeKey()).call([{ role: 'user', content: 'hi' }]);
    const params = sdk.create.mock.calls[0][0];
    expect(params.max_tokens).toBe(1024);
    expect(params).not.toHaveProperty('thinking');
  });

  it('throws AIProviderError on refusal', async () => {
    sdk.create.mockResolvedValue(message({ stop_reason: 'refusal', content: [] }));
    const call = new AnthropicProvider(fakeKey()).call([{ role: 'user', content: 'hi' }]);
    await expect(call).rejects.toBeInstanceOf(AIProviderError);
    await expect(call).rejects.toThrow('anthropic provider request failed: refusal');
  });

  it('returns partial content when stopped by max_tokens', async () => {
    sdk.create.mockResolvedValue(message({ stop_reason: 'max_tokens', content: [{ type: 'text', text: 'partial' }] }));
    const result = await new AnthropicProvider(fakeKey()).call([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('partial');
  });

  it('maps SDK APIError to AIProviderError with status and without the key', async () => {
    const key = fakeKey();
    sdk.create.mockRejectedValue(new sdk.APIError(401, `401 invalid x-api-key ${key}`));
    const error = await new AnthropicProvider(key).call([{ role: 'user', content: 'hi' }]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIProviderError);
    const text = (error as Error).message;
    expect(text).toContain('HTTP 401');
    expect(text).not.toContain(key);
    expect(text).toContain('[redacted]');
  });

  it('maps connection errors (no status) to AIProviderError', async () => {
    sdk.create.mockRejectedValue(new sdk.APIError(undefined, 'Connection error.'));
    await expect(new AnthropicProvider(fakeKey()).call([{ role: 'user', content: 'hi' }])).rejects.toThrow(/network: Connection error/);
  });
});
