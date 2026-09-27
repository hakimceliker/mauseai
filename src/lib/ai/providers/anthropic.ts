import { AIMessage, AIProvider, AIResponse, AIProviderError, CredentialNotConfiguredError } from './base-provider';

const endpoint = 'https://api.anthropic.com/v1/messages';

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  private readonly apiKey: string | undefined;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.apiKey = apiKey;
  }

  async call(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.apiKey) throw new CredentialNotConfiguredError(this.name, 'ANTHROPIC_API_KEY');
    const system = messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    const conversation = messages.filter((message) => message.role !== 'system').map(({ role, content }) => ({ role: role === 'assistant' ? 'assistant' : 'user', content }));
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest', max_tokens: 1024, ...(system ? { system } : {}), messages: conversation }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => 'unknown error');
      throw new AIProviderError(this.name, `HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }
    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const inputTokens = payload.usage?.input_tokens ?? 0;
    const outputTokens = payload.usage?.output_tokens ?? 0;
    return {
      role: 'assistant',
      content: payload.content?.filter((item) => item.type === 'text').map((item) => item.text ?? '').join('') ?? '',
      provider: this.name,
      tokens_used: inputTokens + outputTokens,
      cost: (inputTokens * 0.000003) + (outputTokens * 0.000015),
    };
  }
}
