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

export class CredentialNotConfiguredError extends Error {
  readonly code = 'CREDENTIAL_NOT_CONFIGURED';

  constructor(provider: string, variable: string) {
    super(`${provider} provider is not configured (${variable})`);
    this.name = 'CredentialNotConfiguredError';
  }
}

export class AIProviderError extends Error {
  readonly code = 'AI_PROVIDER_ERROR';

  constructor(provider: string, message: string) {
    super(`${provider} provider request failed: ${message}`);
    this.name = 'AIProviderError';
  }
}
