import { ConfigurationError, intSetting, mocksAllowed, runtimeMode, type Env } from "@/src/lib/config/runtime";
import type { RoutedProvider } from "@/src/lib/core/model-routing";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL, type AnthropicMessagesClient } from "./providers/anthropic";
import { MockClaudeProvider } from "./providers/mock-claude";
import { MockGPTProvider } from "./providers/mock-gpt";
import { DEFAULT_OPENAI_MODEL, OpenAIProvider, type OpenAIChatClient } from "./providers/openai";
import { anthropicPrice, centsPer1k, costCents, openaiPrice } from "./providers/pricing";

/**
 * Builds the provider list the router uses.
 *
 * - Real providers are registered for every configured key (OPENAI_API_KEY →
 *   standard tier, ANTHROPIC_API_KEY → careful tier).
 * - Mock providers are only used in test/development, and only when no real
 *   key is configured or AI_PROVIDER=mock is set explicitly.
 * - In production without any key the call fails with
 *   `ai_provider_not_configured` instead of silently answering with a mock.
 */

export const AI_KEY_ENV = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const;

export interface ProviderClients {
  anthropic?: AnthropicMessagesClient;
  openai?: OpenAIChatClient;
}

export function mockProviders(): RoutedProvider[] {
  return [
    { provider: new MockGPTProvider(), mock: true, centsPer1kTokens: 1, tier: "standard" },
    { provider: new MockClaudeProvider(), mock: true, centsPer1kTokens: 2, tier: "careful" },
  ];
}

export function realProviders(env: Env = process.env, clients: ProviderClients = {}): RoutedProvider[] {
  const timeoutMs = intSetting(env, "AI_TIMEOUT_MS", 25_000, { min: 1_000, max: 600_000 });
  const maxRetries = intSetting(env, "AI_MAX_RETRIES", 1, { min: 0, max: 5 });
  const providers: RoutedProvider[] = [];
  if (env.OPENAI_API_KEY || clients.openai) {
    const model = env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const price = openaiPrice(env);
    providers.push({
      provider: new OpenAIProvider({ apiKey: env.OPENAI_API_KEY ?? "", model, timeoutMs, maxRetries, client: clients.openai }),
      mock: false,
      centsPer1kTokens: centsPer1k(price),
      tier: "standard",
      model,
      costFor: (usage) => costCents(price, usage),
    });
  }
  if (env.ANTHROPIC_API_KEY || clients.anthropic) {
    const model = env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const price = anthropicPrice(model, env);
    providers.push({
      provider: new AnthropicProvider({
        apiKey: env.ANTHROPIC_API_KEY ?? "",
        model,
        timeoutMs,
        maxRetries,
        refusalFallback: env.ANTHROPIC_REFUSAL_FALLBACK !== "off",
        client: clients.anthropic,
      }),
      mock: false,
      centsPer1kTokens: centsPer1k(price),
      tier: "careful",
      model,
      costFor: (usage) => costCents(price, usage),
    });
  }
  return providers;
}

export function buildProviders(env: Env = process.env, clients: ProviderClients = {}): RoutedProvider[] {
  const allowMock = mocksAllowed(env);
  if (allowMock && env.AI_PROVIDER === "mock") return mockProviders();
  const real = realProviders(env, clients);
  if (real.length) return real;
  if (allowMock) return mockProviders();
  throw new ConfigurationError("ai_provider_not_configured", [...AI_KEY_ENV]);
}

let cached: { signature: string; providers: RoutedProvider[] } | null = null;

/** Process-wide provider list, rebuilt only when the relevant configuration changes (keeps SDK connection pools). */
export function sharedProviders(env: Env = process.env): RoutedProvider[] {
  const signature = [
    runtimeMode(env),
    env.AI_PROVIDER ?? "",
    env.OPENAI_API_KEY ? "o" : "",
    env.ANTHROPIC_API_KEY ? "a" : "",
    env.OPENAI_MODEL ?? "",
    env.ANTHROPIC_MODEL ?? "",
    env.AI_TIMEOUT_MS ?? "",
    env.AI_MAX_RETRIES ?? "",
  ].join("|");
  if (!cached || cached.signature !== signature) cached = { signature, providers: buildProviders(env) };
  return cached.providers;
}
