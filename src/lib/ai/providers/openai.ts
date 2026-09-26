import OpenAI from "openai";
import type { AIMessage, AIProvider, AIResponse } from "./base-provider";
import { ProviderError, toProviderError } from "./provider-error";

/**
 * Real OpenAI adapter (official SDK, Chat Completions). Timeouts and retries
 * are handled by the SDK client; failures are normalised to ProviderError.
 * The model is configurable with OPENAI_MODEL.
 */

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

type CreateParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
export interface OpenAIChatClient {
  chat: { completions: { create: (params: CreateParams) => PromiseLike<OpenAI.Chat.Completions.ChatCompletion> } };
}

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  client?: OpenAIChatClient;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly client: OpenAIChatClient;
  private readonly maxTokens: number;

  constructor(options: OpenAIProviderOptions) {
    if (!options.apiKey && !options.client) throw new ProviderError("openai", "auth_failed", false, undefined, "OPENAI_API_KEY missing");
    this.model = options.model || DEFAULT_OPENAI_MODEL;
    this.maxTokens = options.maxTokens ?? 4_096;
    this.client = options.client ?? new OpenAI({ apiKey: options.apiKey, timeout: options.timeoutMs ?? 60_000, maxRetries: options.maxRetries ?? 2 });
  }

  async call(messages: AIMessage[]): Promise<AIResponse> {
    const turns = messages.filter((m) => m.content.trim().length > 0).map((m) => ({ role: m.role, content: m.content }));
    if (!turns.some((m) => m.role === "user")) throw new ProviderError(this.name, "bad_request", false, undefined, "no_user_message");
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await this.client.chat.completions.create({ model: this.model, messages: turns, max_completion_tokens: this.maxTokens });
    } catch (error) {
      throw toProviderError(this.name, error);
    }
    const choice = response.choices?.[0];
    if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) throw new ProviderError(this.name, "refused", false);
    const text = choice?.message?.content?.trim();
    if (!text) throw new ProviderError(this.name, "empty_response", true);
    const usage = { inputTokens: response.usage?.prompt_tokens ?? 0, outputTokens: response.usage?.completion_tokens ?? 0 };
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
