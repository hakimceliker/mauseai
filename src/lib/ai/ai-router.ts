import { AIProvider, AIMessage, AIResponse } from './providers/base-provider';
import { MockGPTProvider } from './providers/mock-gpt';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';

/**
 * AI Router - selects appropriate provider based on environment configuration
 * Supports: openai/gpt, anthropic/claude, mock.
 * Production deployments must select a real provider explicitly; mock is
 * retained for local development and deterministic tests.
 */
export class AIRouter {
  private provider: AIProvider;

  constructor() {
    const aiProvider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

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
