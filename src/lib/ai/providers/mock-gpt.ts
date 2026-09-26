import { AIProvider, AIMessage, AIResponse } from './base-provider';

/**
 * Mock OpenAI GPT provider for testing and development
 */
export class MockGPTProvider implements AIProvider {
  name = 'mock-gpt';

  async call(messages: AIMessage[]): Promise<AIResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || 'No message';

    return {
      role: 'assistant',
      content: `[Mock GPT Response] Processing: "${userContent.substring(0, 50)}..."`,
      provider: this.name,
      tokens_used: Math.floor(Math.random() * 500) + 100,
      cost: 0.0001,
    };
  }
}
