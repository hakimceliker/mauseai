import { AIProvider, AIMessage, AIResponse } from './base-provider';

/**
 * Mock Anthropic Claude provider for testing and development
 */
export class MockClaudeProvider implements AIProvider {
  name = 'mock-claude';

  async call(messages: AIMessage[]): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || 'No message';

    return {
      role: 'assistant',
      content: `[Mock Claude Response] I understand: "${userContent.substring(0, 50)}..."`,
      provider: this.name,
      tokens_used: Math.floor(Math.random() * 600) + 150,
      cost: 0.00015,
      cost_basis: 'mock',
    };
  }
}
