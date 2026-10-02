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
    if (
      process.env.NODE_ENV === 'production' &&
      (endpoint.port === '11434' ||
        isLoopbackHost(endpoint.hostname))
    ) {
      throw new AIProviderError(this.name, 'unsafe_endpoint');
    }

    const connectTimeoutMs = Number(process.env.LOCAL_AI_CONNECT_TIMEOUT_MS ?? 3000);
    const inferenceTimeoutMs = Number(process.env.LOCAL_AI_INFERENCE_TIMEOUT_MS ?? 45000);
    const model = process.env.LOCAL_AI_MODEL ?? 'qwen3:8b';
    const gatewayMode = process.env.LOCAL_AI_PROTOCOL === 'gateway' || /:8080(?:\/|$)/.test(baseUrl);
    let response: Response;
    const controller = new AbortController();
    let timer = setTimeout(() => controller.abort(), Math.max(250, connectTimeoutMs));
    try {
      const prompt = messages.map((message) => `${message.role}: ${message.content}`).join('\n');
      response = await fetch(gatewayMode ? `${baseUrl}/chat` : `${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatewayMode
          ? { prompt, mode: 'fast', project: process.env.AI_PROJECT ?? 'mauseai', model }
          : { model, messages, stream: false }),
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
      const inputTokens = payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.output_tokens ?? payload.usage?.completion_tokens ?? 0;
      return {
        role: 'assistant',
        content,
        provider: this.name,
        model: typeof payload.model === 'string' ? payload.model : model,
        tokens_used: inputTokens + outputTokens,
        cost: 0,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
