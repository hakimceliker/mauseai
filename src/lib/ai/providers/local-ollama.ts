import { AIMessage, AIProvider, AIResponse, AIProviderError } from './base-provider';
import { safeProviderDetail } from './request-policy';

/** Ollama or senatech-ai-gateway OpenAI-compatible local adapter. */
export class LocalOllamaProvider implements AIProvider {
  readonly name = 'local';

  async call(messages: AIMessage[]): Promise<AIResponse> {
    const baseUrl = (process.env.LOCAL_AI_BASE_URL ?? '').replace(/\/$/, '');
    if (!baseUrl) throw new AIProviderError(this.name, 'LOCAL_AI_BASE_URL_not_configured');
    const connectTimeoutMs = Number(process.env.LOCAL_AI_CONNECT_TIMEOUT_MS ?? 3000);
    const inferenceTimeoutMs = Number(process.env.LOCAL_AI_INFERENCE_TIMEOUT_MS ?? 45000);
    let response: Response;
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), Math.max(250, connectTimeoutMs));
    try {
      response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.LOCAL_AI_MODEL ?? 'qwen3:8b', messages, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), Math.max(1000, inferenceTimeoutMs));
    } catch {
      clearTimeout(timer);
      throw new AIProviderError(this.name, 'connect_timeout_or_network_error');
    }
    try {
      if (!response.ok) {
        const detail = await response.text().catch(() => 'unknown error');
        throw new AIProviderError(this.name, `HTTP ${response.status}: ${safeProviderDetail(detail)}`);
      }
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;
      return { role: 'assistant', content: payload.choices?.[0]?.message?.content ?? '', provider: this.name, tokens_used: inputTokens + outputTokens, cost: 0 };
    } finally {
      clearTimeout(timer);
    }
  }
}
