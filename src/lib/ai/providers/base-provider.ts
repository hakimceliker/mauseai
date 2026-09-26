/**
 * Base interface for AI providers
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  role: 'assistant';
  content: string;
  provider: string;
  tokens_used?: number;
  cost?: number;
}

export interface AIProvider {
  name: string;
  call(messages: AIMessage[]): Promise<AIResponse>;
}
