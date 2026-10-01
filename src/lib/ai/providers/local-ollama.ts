import { AIMessage, AIProvider, AIResponse, AIProviderError } from './base-provider';
import { safeProviderDetail } from './request-policy';

/** Ollama or senatech-ai-gateway OpenAI-compatible local adapter. */
export class LocalOllamaProvider implements AIProvider {
  readonly name = 'local';

  async call(messages: AIMessage[]): Promise<AIResponse> {
    const baseUrl = (process.env.LOCAL_AI_BASE_URL ?? '').replace(/\/$/, '');
    if (!baseUrl) throw new AIProviderError(this.name, 'LOCAL_AI_BASE_URL_not_configured');

    const gatewayMode = process.env.LOCAL_AI_PROTOCOL === 'gateway' || /:8080(?:\/|$)/.test(baseUrl);
    const healthPath = process.env.LOCAL_AI_HEALTH_PATH ?? (gatewayMode ? '/health' : '/api/tags');
    const connectTimeoutMs = this.timeoutMs(process.env.LOCAL_AI_CONNECT_TIMEOUT_MS, 3000, 250);
    const inferenceTimeoutMs = this.timeoutMs(process.env.LOCAL_AI_INFERENCE_TIMEOUT_MS, 45000, 1000);
    const clientId = process.env.LOCAL_AI_ACCESS_CLIENT_ID ?? '';
    const clientSecret = process.env.LOCAL_AI_ACCESS_CLIENT_SECRET ?? '';
    const isProduction = process.env.NODE_ENV === 'production';

    if (Boolean(clientId) !== Boolean(clientSecret)) {
      throw new AIProviderError(this.name, 'incomplete_access_service_token');
    }
    let endpoint: URL;
    try {
      endpoint = new URL(baseUrl);
    } catch {
      throw new AIProviderError(this.name, 'invalid_local_endpoint_url');
    }
    if (isProduction && (endpoint.protocol !== 'https:' || !clientId || !clientSecret)) {
      throw new AIProviderError(this.name, 'production_requires_https_and_access_service_token');
    }
    if (isProduction && ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)) {
      throw new AIProviderError(this.name, 'production_local_endpoint_must_use_private_tunnel');
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    const healthController = new AbortController();
    const healthTimer = setTimeout(() => healthController.abort(), connectTimeoutMs);
    try {
      const healthResponse = await fetch(new URL(healthPath, baseUrl + '/'), {
        method: 'GET',
        headers,
        signal: healthController.signal,
      });
      if (!healthResponse.ok) {
        throw new AIProviderError(this.name, `health_http_${healthResponse.status}`);
      }
      await healthResponse.body?.cancel().catch(() => undefined);
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(this.name, healthController.signal.aborted ? 'health_timeout' : 'health_unavailable');
    } finally {
      clearTimeout(healthTimer);
    }

    const prompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n');
    const url = gatewayMode ? `${baseUrl}/chat` : `${baseUrl}/v1/chat/completions`;
    const body = gatewayMode
      ? { prompt, mode: 'fast', project: process.env.AI_PROJECT ?? 'mauseai' }
      : { model: process.env.LOCAL_AI_MODEL ?? 'qwen3:8b', messages, stream: false };
    const inferenceController = new AbortController();
    const inferenceTimer = setTimeout(() => inferenceController.abort(), inferenceTimeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: inferenceController.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => 'unknown error');
        throw new AIProviderError(this.name, `HTTP ${response.status}: ${safeProviderDetail(detail)}`);
      }

      const payload = await response.json() as {
        response?: string;
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };
      };
      const inputTokens = payload.usage?.input_tokens ?? payload.usage?.prompt_tokens;
      const outputTokens = payload.usage?.output_tokens ?? payload.usage?.completion_tokens;
      const content = payload.response ?? payload.choices?.[0]?.message?.content ?? '';
      if (!content) throw new AIProviderError(this.name, 'provider_returned_no_text');

      return {
        role: 'assistant',
        content,
        provider: this.name,
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        tokens_used: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
        cost: 0,
        cost_basis: 'local_api_zero',
      };
    } catch (error) {
      if (error instanceof AIProviderError) throw error;
      throw new AIProviderError(this.name, inferenceController.signal.aborted ? 'inference_timeout' : 'inference_error');
    } finally {
      clearTimeout(inferenceTimer);
    }
  }

  private timeoutMs(value: string | undefined, fallback: number, minimum: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
  }
}
