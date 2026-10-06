import { describe, it, expect, vi } from 'vitest';
import { MockGPTProvider } from '@/src/lib/ai/providers/mock-gpt';
import { MockClaudeProvider } from '@/src/lib/ai/providers/mock-claude';
import { AIRouter } from '@/src/lib/ai/ai-router';
import { AIMessage } from '@/src/lib/ai/providers/base-provider';

describe('AI Providers', () => {
  describe('MockGPTProvider', () => {
    it('should return a mock GPT response', async () => {
      const provider = new MockGPTProvider();
      const messages: AIMessage[] = [
        { role: 'user', content: 'What is 2+2?' },
      ];

      const response = await provider.call(messages);

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.provider).toBe('mock-gpt');
      expect(response.content).toContain('Mock GPT Response');
      expect(response.tokens_used).toBeDefined();
      expect(response.cost).toBeGreaterThan(0);
      expect(response.cost_basis).toBe('mock');
    });

    it('should have correct provider name', () => {
      const provider = new MockGPTProvider();
      expect(provider.name).toBe('mock-gpt');
    });
  });

  describe('MockClaudeProvider', () => {
    it('should return a mock Claude response', async () => {
      const provider = new MockClaudeProvider();
      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello Claude' },
      ];

      const response = await provider.call(messages);

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.provider).toBe('mock-claude');
      expect(response.content).toContain('Mock Claude Response');
      expect(response.tokens_used).toBeDefined();
      expect(response.cost).toBeGreaterThan(0);
      expect(response.cost_basis).toBe('mock');
    });

    it('should have correct provider name', () => {
      const provider = new MockClaudeProvider();
      expect(provider.name).toBe('mock-claude');
    });
  });

  describe('AIRouter', () => {
    it('should route GPT alias to the real OpenAI provider', () => {
      const originalEnv = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = 'gpt';

      const router = new AIRouter();
      expect(router.getProviderName()).toBe('openai');

      process.env.AI_PROVIDER = originalEnv;
    });

    it('should route Claude alias to the real Anthropic provider', () => {
      const originalEnv = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = 'claude';

      const router = new AIRouter();
      expect(router.getProviderName()).toBe('anthropic');

      process.env.AI_PROVIDER = originalEnv;
    });

    it('should default to mock GPT provider', async () => {
      const originalEnv = process.env.AI_PROVIDER;
      delete process.env.AI_PROVIDER;

      const router = new AIRouter();
      expect(router.getProviderName()).toBe('mock-gpt');

      process.env.AI_PROVIDER = originalEnv;
    });

    it('should default to a configured real provider in production', () => {
      const originalProvider = process.env.AI_PROVIDER;
      const originalOpenAIKey = process.env.OPENAI_API_KEY;
      vi.stubEnv('NODE_ENV', 'production');
      delete process.env.AI_PROVIDER;
      process.env.OPENAI_API_KEY = 'test-only-placeholder';

      const router = new AIRouter();
      expect(router.getProviderName()).toBe('openai');

      process.env.AI_PROVIDER = originalProvider;
      vi.unstubAllEnvs();
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    });

    it('should support static execute method', async () => {
      const messages: AIMessage[] = [{ role: 'user', content: 'test' }];
      const response = await AIRouter.execute(messages);

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.provider).toBeDefined();
    });
  });
});
