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
  /** Model id that produced the answer (real providers only). */
  model?: string;
  /** Token usage reported by the provider (real providers only). */
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AIProvider {
  name: string;
  call(messages: AIMessage[]): Promise<AIResponse>;
}
