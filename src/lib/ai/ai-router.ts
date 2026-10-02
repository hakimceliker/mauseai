import { AIProvider, AIMessage, AIResponse, CredentialNotConfiguredError } from './providers/base-provider';
import { MockGPTProvider } from './providers/mock-gpt';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { observability } from '@/src/lib/observability';
import { LocalOllamaProvider } from './providers/local-ollama';

/**
 * AI Router - selects appropriate provider based on environment configuration
 * Supports: openai/gpt, anthropic/claude, mock.
 * Production deployments must select a real provider explicitly; mock is
 * retained for local development and deterministic tests.
 */
export class AIRouter {
  private provider: AIProvider;
  private readonly fallbackProvider?: AIProvider;

  constructor() {
    const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
    const aiProvider = configuredProvider ||
      (process.env.NODE_ENV === 'production'
        ? process.env.OPENAI_API_KEY
          ? 'openai'
          : process.env.ANTHROPIC_API_KEY
            ? 'anthropic'
            : 'openai'
        : 'mock');

    switch (aiProvider) {
      case 'gpt':
      case 'openai':
        this.provider = new OpenAIProvider();
        break;
      case 'claude':
      case 'anthropic':
        this.provider = new AnthropicProvider();
        break;
      case 'mock':
      default:
        // Default to GPT mock for 'mock' provider
        this.provider = new MockGPTProvider();
        break;
    }
    if (process.env.LOCAL_AI_ENABLED !== 'false' && process.env.LOCAL_AI_BASE_URL) {
      this.fallbackProvider = this.provider;
      this.provider = new LocalOllamaProvider();
    }
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Call the AI provider
   */
  async call(messages: AIMessage[]): Promise<AIResponse> {
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    try {
      const response = await this.provider.call(messages);
      this.emitTelemetry(response, false, startedAtMs);
      this.reportTrace(response, messages, startedAt);
      return response;
    } catch (error) {
      if (this.fallbackProvider) {
        const reason = this.classifyFailure(error);
        console.warn(JSON.stringify({ event: 'ai_provider_fallback', provider: this.provider.name, reason, next: this.fallbackProvider.name }));
        try {
          const response = await this.fallbackProvider.call(messages);
          this.emitTelemetry(response, true, startedAtMs, reason);
          this.reportTrace(response, messages, startedAt, { fallback: true, fallback_reason: reason });
          return response;
        } catch (fallbackError) {
          void observability.reportException(fallbackError, { provider: this.fallbackProvider.name, fallback: true }).catch(() => undefined);
        }
      }
      void observability.reportException(error, { provider: this.provider.name }).catch(() => undefined);
      throw error;
    }
  }

  private emitTelemetry(response: AIResponse, fallback: boolean, startedAtMs: number, fallbackReason?: string): void {
    console.info(JSON.stringify({
      event: 'ai_provider_selected',
      provider: response.provider,
      model: response.provider === 'local' ? response.model ?? process.env.LOCAL_AI_MODEL ?? 'qwen3:8b' : undefined,
      route: response.provider === 'local' ? 'LOCAL' : 'CLOUD',
      fallback,
      fallback_reason: fallbackReason,
      latency_ms: Date.now() - startedAtMs,
      tokens_used: response.tokens_used ?? 0,
      cost: response.cost ?? 0,
    }));
  }

  private reportTrace(response: AIResponse, messages: AIMessage[], startedAt: string, metadata: Record<string, unknown> = {}): void {
    void observability.reportTrace({
      name: `${response.provider}.completion`,
      input: messages,
      output: response.content,
      metadata: { provider: response.provider, tokens_used: response.tokens_used, ...metadata },
      startedAt,
      endedAt: new Date().toISOString(),
    }).catch(() => undefined);
  }

  private classifyFailure(error: unknown): string {
    if (error instanceof CredentialNotConfiguredError) return 'credential_not_configured';
    if (error instanceof Error && error.message.includes('invalid_response')) return 'invalid_response';
    if (error instanceof Error && /timeout|network|connect/i.test(error.message)) return 'network_or_timeout';
    return 'provider_error';
  }

  /**
   * Static method for easy access
   */
  static async execute(messages: AIMessage[]): Promise<AIResponse> {
    const router = new AIRouter();
    return router.call(messages);
  }
}
