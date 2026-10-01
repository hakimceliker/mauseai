import { AIMessage, AIProvider, AIResponse, AIProviderError, CredentialNotConfiguredError } from './base-provider';
import { requestWithPolicy, safeProviderDetail } from './request-policy';

const endpoint = 'https://api.openai.com/v1/chat/completions';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.OPENAI_API_KEY) {
    this.apiKey = apiKey;
  }

  async call(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.apiKey) throw new CredentialNotConfiguredError(this.name, 'OPENAI_API_KEY');

    let response: Response;
    try {
      response = await requestWithPolicy(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', messages, temperature: 0.2 }),
      });
    } catch {
      throw new AIProviderError(this.name, 'request_timeout_or_network_error');
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => 'unknown error');
      throw new AIProviderError(this.name, `HTTP ${response.status}: ${safeProviderDetail(detail)}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const inputTokens = payload.usage?.prompt_tokens;
    const outputTokens = payload.usage?.completion_tokens;
    const usageAvailable = inputTokens !== undefined && outputTokens !== undefined;
    return {
      role: 'assistant',
      content: payload.choices?.[0]?.message?.content ?? '',
      provider: this.name,
      tokens_used: usageAvailable ? inputTokens + outputTokens : undefined,
      tokens_in: inputTokens,
      tokens_out: outputTokens,
      cost: usageAvailable ? (inputTokens * 0.00000015) + (outputTokens * 0.0000006) : undefined,
      cost_basis: usageAvailable ? 'provider_rate_estimate' : 'unknown',
    };
  }
}
