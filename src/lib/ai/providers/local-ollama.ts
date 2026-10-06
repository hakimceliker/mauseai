import { isIP } from 'node:net';
import { AIMessage, AIProvider, AIResponse, AIProviderError } from './base-provider';

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIP(host) === 4) return host.startsWith('127.');
  if (isIP(host) !== 6) return false;

  const [left, right = ''] = host.split('::');
  const leftGroups = left ? left.split(':') : [];
  const rightGroups = right ? right.split(':') : [];
  const groups = [
    ...leftGroups,
    ...Array<string>(8 - leftGroups.length - rightGroups.length).fill('0'),
    ...rightGroups,
  ].map((group) => Number.parseInt(group, 16));

  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1) return true;
  const ipv4CompatibleOrMapped = groups.slice(0, 5).every((group) => group === 0)
    && (groups[5] === 0 || groups[5] === 0xffff);
  return ipv4CompatibleOrMapped && (groups[6] >> 8) === 127;
}
/** Ollama or senatech-ai-gateway OpenAI-compatible local adapter. */
export class LocalOllamaProvider implements AIProvider {
  readonly name = 'local';

  async call(messages: AIMessage[]): Promise<AIResponse> {
    const baseUrl = (process.env.LOCAL_AI_BASE_URL ?? '').replace(/\/$/, '');
    if (!baseUrl) throw new AIProviderError(this.name, 'LOCAL_AI_BASE_URL_not_configured');
    let endpoint: URL;
    try {
      endpoint = new URL(baseUrl);
    } catch {
      throw new AIProviderError(this.name, 'invalid_base_url');
    }
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password
    ) {
      throw new AIProviderError(this.name, 'invalid_base_url');
    }

    const clientId = process.env.LOCAL_AI_ACCESS_CLIENT_ID ?? '';
    const clientSecret = process.env.LOCAL_AI_ACCESS_CLIENT_SECRET ?? '';
    if (Boolean(clientId) !== Boolean(clientSecret)) {
      throw new AIProviderError(this.name, 'incomplete_access_service_token');
    }
    if (process.env.NODE_ENV === 'production') {
      if (endpoint.port === '11434' || isLoopbackHost(endpoint.hostname)) {
        throw new AIProviderError(this.name, 'unsafe_endpoint');
      }
      if (endpoint.protocol !== 'https:' || !clientId || !clientSecret) {
        throw new AIProviderError(this.name, 'production_requires_https_and_access_service_token');
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientId && clientSecret) {
      headers['CF-Access-Client-Id'] = clientId;
      headers['CF-Access-Client-Secret'] = clientSecret;
    }

    const connectTimeoutMs = this.timeoutMs(process.env.LOCAL_AI_CONNECT_TIMEOUT_MS, 3000, 250);
    const inferenceTimeoutMs = this.timeoutMs(process.env.LOCAL_AI_INFERENCE_TIMEOUT_MS, 45000, 1000);
    const model = process.env.LOCAL_AI_MODEL ?? 'qwen3:8b';
    const configuredProtocol = process.env.LOCAL_AI_PROTOCOL?.trim().toLowerCase();
    const gatewayMode = configuredProtocol === 'gateway' ||
      (!configuredProtocol && /:8080(?:\/|$)/.test(baseUrl));
    let response: Response;
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), connectTimeoutMs);
    try {
      const prompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n');
      response = await fetch(gatewayMode ? `${baseUrl}/chat` : `${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(gatewayMode
          ? { prompt, mode: 'fast', project: process.env.AI_PROJECT ?? 'mauseai', model }
          : { model, messages, stream: false }),
        redirect: 'error',
        signal: controller.signal,
      });
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), inferenceTimeoutMs);
    } catch {
      clearTimeout(timer);
      throw new AIProviderError(this.name, 'connect_timeout_or_network_error');
    }
    try {
      if (!response.ok) {
        controller.abort();
        throw new AIProviderError(this.name, `HTTP ${response.status}`);
      }
      let rawPayload: unknown;
      try {
        rawPayload = await response.json();
      } catch {
        throw new AIProviderError(
          this.name,
          controller.signal.aborted ? 'connect_timeout_or_network_error' : 'invalid_response_json',
        );
      }
      if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
        throw new AIProviderError(this.name, 'invalid_response_json');
      }
      const payload = rawPayload as {
        response?: unknown;
        choices?: Array<{ message?: { content?: unknown } }>;
        model?: unknown;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          input_tokens?: number;
          output_tokens?: number;
        };
      };
      const content = typeof payload.response === 'string'
        ? payload.response
        : payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new AIProviderError(this.name, 'invalid_response_empty_content');
      }
      if (
        (gatewayMode && payload.model !== model) ||
        (typeof payload.model === 'string' && payload.model !== model)
      ) {
        throw new AIProviderError(this.name, 'invalid_response_model_mismatch');
      }
      const inputTokens = payload.usage?.input_tokens ?? payload.usage?.prompt_tokens;
      const outputTokens = payload.usage?.output_tokens ?? payload.usage?.completion_tokens;
      return {
        role: 'assistant',
        content,
        provider: this.name,
        model: typeof payload.model === 'string' ? payload.model : model,
        tokens_in: inputTokens,
        tokens_out: outputTokens,
        tokens_used: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
        cost: 0,
        cost_basis: 'local_api_zero',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private timeoutMs(value: string | undefined, fallback: number, minimum: number): number {
    const parsed = Number(value);
    return value !== undefined && Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
  }
}
