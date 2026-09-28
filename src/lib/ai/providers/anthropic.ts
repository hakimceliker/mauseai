import Anthropic, { APIError } from '@anthropic-ai/sdk';
import type { Message, MessageCreateParamsNonStreaming, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { AIMessage, AIProvider, AIResponse, AIProviderError, CredentialNotConfiguredError } from './base-provider';

const DEFAULT_MODEL = 'claude-opus-5';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_RETRIES = 2;
// USD per 1M tokens. These defaults are an ESTIMATE of the Claude Opus 5 list price
// and are only used for internal cost accounting; override via env when pricing changes.
const DEFAULT_PRICE_INPUT_PER_1M = 5;
const DEFAULT_PRICE_OUTPUT_PER_1M = 25;
const MAX_ERROR_DETAIL = 200;

function readNumber(name: string, fallback: number, { min = 0, integer = false } = {}): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || (integer && !Number.isInteger(value))) return fallback;
  return value;
}

function sanitize(message: string, apiKey: string): string {
  let result = message;
  if (apiKey) result = result.split(apiKey).join('[redacted]');
  result = result.replace(/sk-ant-[A-Za-z0-9_-]+/g, '[redacted]');
  return result.slice(0, MAX_ERROR_DETAIL);
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.apiKey = apiKey;
  }

  async call(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.apiKey) throw new CredentialNotConfiguredError(this.name, 'ANTHROPIC_API_KEY');
    const apiKey = this.apiKey;

    const client = new Anthropic({
      apiKey,
      timeout: readNumber('ANTHROPIC_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, { min: 1, integer: true }),
      maxRetries: readNumber('ANTHROPIC_MAX_RETRIES', DEFAULT_MAX_RETRIES, { integer: true }),
    });

    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    const conversation: MessageParam[] = messages
      .filter((message) => message.role !== 'system')
      .map(({ role, content }) => ({ role: role === 'assistant' ? 'assistant' : 'user', content }));

    // Opus 5 rejects temperature/top_p/top_k and `thinking: {type: 'enabled'}`; only adaptive thinking is opt-in.
    const params: MessageCreateParamsNonStreaming = {
      model: process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
      max_tokens: readNumber('ANTHROPIC_MAX_TOKENS', DEFAULT_MAX_TOKENS, { min: 1, integer: true }),
      ...(system ? { system } : {}),
      messages: conversation,
      ...(process.env.ANTHROPIC_THINKING === 'adaptive' ? { thinking: { type: 'adaptive' as const } } : {}),
    };

    let response: Message;
    try {
      response = await client.messages.create(params);
    } catch (error) {
      if (error instanceof APIError) {
        const status = error.status === undefined ? 'network' : `HTTP ${error.status}`;
        throw new AIProviderError(this.name, `${status}: ${sanitize(error.message, apiKey)}`);
      }
      const detail = error instanceof Error ? error.message : 'unknown error';
      throw new AIProviderError(this.name, sanitize(detail, apiKey));
    }

    if (response.stop_reason === 'refusal') {
      throw new AIProviderError(this.name, 'refusal');
    }
    // stop_reason 'max_tokens' means the output was truncated. AIResponse has no field for it,
    // so the partial content is returned as-is; callers can raise ANTHROPIC_MAX_TOKENS if needed.

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const priceIn = readNumber('ANTHROPIC_PRICE_INPUT_PER_1M', DEFAULT_PRICE_INPUT_PER_1M);
    const priceOut = readNumber('ANTHROPIC_PRICE_OUTPUT_PER_1M', DEFAULT_PRICE_OUTPUT_PER_1M);

    return {
      role: 'assistant',
      content: (response.content ?? [])
        .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
        .map((block) => block.text)
        .join(''),
      provider: this.name,
      tokens_used: inputTokens + outputTokens,
      cost: (inputTokens * priceIn + outputTokens * priceOut) / 1_000_000,
    };
  }
}
