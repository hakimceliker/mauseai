import Anthropic from "@anthropic-ai/sdk";
import type { AIMessage, AIProvider, AIResponse } from "./base-provider";
import { ProviderError, toProviderError } from "./provider-error";

/**
 * Real Anthropic Claude adapter (official SDK). Timeouts and retries (408,
 * 409, 429, 5xx, connection errors) are handled by the SDK client; failures
 * are normalised to ProviderError so the router can fall back.
 */

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";
/** Models that accept the server-side refusal fallback parameter. */
const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-opus-5-5", "claude-fable-5-1", "claude-fable-5"]);

type CreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
export interface AnthropicMessagesClient {
  beta: { messages: { create: (params: CreateParams) => PromiseLike<Anthropic.Beta.Messages.BetaMessage> } };
}

export interface AnthropicProviderOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  /** Server-side refusal fallback ("default" routing); on by default for models that support it. */
  refusalFallback?: boolean;
  client?: AnthropicMessagesClient;
}

export function toAnthropicMessages(messages: AIMessage[]): { system: string | undefined; messages: Anthropic.Beta.Messages.BetaMessageParam[] } {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || undefined;
  const turns = messages
    .filter((m) => m.role !== "system" && m.content.trim().length > 0)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (!turns.length || turns[0].role !== "user") throw new ProviderError("anthropic", "bad_request", false, undefined, "conversation_must_start_with_user");
  return { system, messages: turns };
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private readonly client: AnthropicMessagesClient;
  private readonly maxTokens: number;
  private readonly refusalFallback: boolean;

  constructor(options: AnthropicProviderOptions) {
    if (!options.apiKey && !options.client) throw new ProviderError("anthropic", "auth_failed", false, undefined, "ANTHROPIC_API_KEY missing");
    this.model = options.model || DEFAULT_ANTHROPIC_MODEL;
    this.maxTokens = options.maxTokens ?? 16_000;
    this.refusalFallback = (options.refusalFallback ?? true) && FALLBACK_MODELS.has(this.model);
    this.client =
      options.client ??
      new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs ?? 60_000, maxRetries: options.maxRetries ?? 2 });
  }

  async call(messages: AIMessage[]): Promise<AIResponse> {
    const { system, messages: turns } = toAnthropicMessages(messages);
    const params: CreateParams = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: turns,
      ...(system ? { system } : {}),
      ...(this.refusalFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    };
    let response: Anthropic.Beta.Messages.BetaMessage;
    try {
      response = await this.client.beta.messages.create(params);
    } catch (error) {
      throw toProviderError(this.name, error);
    }
    if (response.stop_reason === "refusal") throw new ProviderError(this.name, "refused", false, undefined, response.stop_details?.category ?? undefined);
    const text = response.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new ProviderError(this.name, "empty_response", true);
    const usage = { inputTokens: response.usage.input_tokens ?? 0, outputTokens: response.usage.output_tokens ?? 0 };
    return {
      role: "assistant",
      content: text,
      provider: this.name,
      model: response.model,
      usage,
      tokens_used: usage.inputTokens + usage.outputTokens,
    };
  }
}
