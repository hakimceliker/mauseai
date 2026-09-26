import { ConfigurationError, mocksAllowed, type Env } from '@/src/lib/config/runtime';
import { AIProvider, AIMessage, AIResponse } from './providers/base-provider';
import { MockGPTProvider } from './providers/mock-gpt';
import { MockClaudeProvider } from './providers/mock-claude';
import { realProviders } from './provider-registry';

/**
 * AI Router - selects a provider from environment configuration.
 *
 * AI_PROVIDER=gpt|openai prefers OpenAI, claude|anthropic prefers Anthropic.
 * A real adapter is used whenever its key is configured. Mock providers are
 * only returned in test/development; in production a missing key raises
 * ConfigurationError("ai_provider_not_configured").
 */
export class AIRouter {
  private provider: AIProvider;

  constructor(env: Env = process.env) {
    const preference = (env.AI_PROVIDER || 'mock').toLowerCase();
    const wantsClaude = preference === 'claude' || preference === 'anthropic';
    const real = preference === 'mock' && mocksAllowed(env) ? [] : realProviders(env);
    const preferred = real.find((p) => (wantsClaude ? p.tier === 'careful' : p.tier === 'standard')) ?? real[0];
    if (preferred) {
      this.provider = preferred.provider;
    } else if (mocksAllowed(env)) {
      this.provider = wantsClaude ? new MockClaudeProvider() : new MockGPTProvider();
    } else {
      throw new ConfigurationError('ai_provider_not_configured', ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']);
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
    return this.provider.call(messages);
  }

  /**
   * Static method for easy access
   */
  static async execute(messages: AIMessage[]): Promise<AIResponse> {
    const router = new AIRouter();
    return router.call(messages);
  }
}
