import { describe, expect, it, vi, afterEach } from 'vitest';
import { AnthropicProvider } from '@/src/lib/ai/providers/anthropic';
import { OpenAIProvider } from '@/src/lib/ai/providers/openai';
import { CredentialNotConfiguredError } from '@/src/lib/ai/providers/base-provider';

const messages = [{ role: 'user' as const, content: 'test goal' }];

describe('real AI providers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stops safely when OpenAI credential is absent', async () => {
    await expect(new OpenAIProvider(undefined).call(messages)).rejects.toBeInstanceOf(CredentialNotConfiguredError);
  });

  it('stops safely when Anthropic credential is absent', async () => {
    await expect(new AnthropicProvider(undefined).call(messages)).rejects.toBeInstanceOf(CredentialNotConfiguredError);
  });

  it('normalizes an OpenAI response without exposing credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'done' } }],
      usage: { prompt_tokens: 4, completion_tokens: 6 },
    }), { status: 200 })));
    const result = await new OpenAIProvider('test-key').call(messages);
    expect(result.provider).toBe('openai');
    expect(result.content).toBe('done');
    expect(result.tokens_used).toBe(10);
    expect(JSON.stringify(result)).not.toContain('test-key');
  });

  it('normalizes an Anthropic response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: 'text', text: 'done' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 4, output_tokens: 6 },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await new AnthropicProvider('test-key').call(messages);
    expect(result.provider).toBe('anthropic');
    expect(result.content).toBe('done');
    expect(result.tokens_used).toBe(10);
  });
});
