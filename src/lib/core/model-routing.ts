import type { AIMessage, AIProvider, AIResponse } from "@/src/lib/ai/providers/base-provider";
import { sharedProviders } from "@/src/lib/ai/provider-registry";
import { ProviderError } from "@/src/lib/ai/providers/provider-error";

/**
 * Model routing with fallback (diagram cards CORE — "Model yönlendirme" and
 * S — "Fallback"). Providers are chosen by risk level and remaining budget;
 * a per-provider circuit breaker moves traffic to the next candidate after
 * repeated failures.
 *
 * Providers come from the registry (src/lib/ai/provider-registry.ts): the
 * real OpenAI and Anthropic adapters when their keys are configured; the mock
 * providers only in test/development. Every response carries `mock` so a
 * mock answer is never presented as real model output.
 */

export interface RoutedProvider {
  provider: AIProvider;
  mock: boolean;
  /** Estimated cost in cents per 1K tokens, used for budget-aware routing. */
  centsPer1kTokens: number;
  tier: "standard" | "careful";
  /** Model id for real providers. */
  model?: string;
  /** Exact cost from provider-reported usage; falls back to the per-1K estimate when absent. */
  costFor?: (usage: { inputTokens: number; outputTokens: number }) => number;
}

export interface RouteDecision {
  primary: string;
  candidates: string[];
  reason: string;
}

export interface RoutedResponse extends AIResponse {
  mock: boolean;
  attempts: Array<{ provider: string; ok: boolean; error?: string; retryable?: boolean; latencyMs: number }>;
  fallbackUsed: boolean;
}

export class CircuitBreaker {
  private failures = new Map<string, { count: number; openedAt: number | null }>();

  constructor(
    private readonly threshold = 3,
    private readonly cooldownMs = 30_000,
    private readonly now: () => number = Date.now,
  ) {}

  isOpen(name: string): boolean {
    const state = this.failures.get(name);
    if (!state?.openedAt) return false;
    if (this.now() - state.openedAt >= this.cooldownMs) {
      // Half-open: allow one trial request.
      this.failures.set(name, { count: this.threshold - 1, openedAt: null });
      return false;
    }
    return true;
  }

  recordSuccess(name: string): void {
    this.failures.delete(name);
  }

  recordFailure(name: string): void {
    const state = this.failures.get(name) ?? { count: 0, openedAt: null };
    state.count += 1;
    if (state.count >= this.threshold) state.openedAt = this.now();
    this.failures.set(name, state);
  }
}

/** Providers for the current runtime; throws ConfigurationError("ai_provider_not_configured") in production without keys. */
export function defaultProviders(): RoutedProvider[] {
  return sharedProviders();
}

export function decideRoute(
  providers: RoutedProvider[],
  input: { riskLevel: string; remainingBudgetCents: number | null; estimatedTokens: number },
): RouteDecision {
  if (!providers.length) throw new Error("no_ai_provider_configured");
  const highRisk = input.riskLevel === "L3" || input.riskLevel === "L4";
  const costOf = (p: RoutedProvider) => (p.centsPer1kTokens * input.estimatedTokens) / 1000;
  const affordable = providers.filter(
    (p) => input.remainingBudgetCents === null || costOf(p) <= input.remainingBudgetCents,
  );
  const pool = affordable.length ? affordable : providers;
  const preferredTier = highRisk ? "careful" : "standard";
  const ordered = [...pool].sort((a, b) => {
    const tierA = a.tier === preferredTier ? 0 : 1;
    const tierB = b.tier === preferredTier ? 0 : 1;
    return tierA - tierB || a.centsPer1kTokens - b.centsPer1kTokens;
  });
  const reason = [
    highRisk ? `risk ${input.riskLevel}: dikkatli model tercih edildi` : `risk ${input.riskLevel}: standart model`,
    affordable.length < providers.length ? "bütçeyi aşan modeller elendi" : null,
  ]
    .filter(Boolean)
    .join("; ");
  return { primary: ordered[0].provider.name, candidates: ordered.map((p) => p.provider.name), reason };
}

export async function callWithFallback(
  providers: RoutedProvider[],
  decision: RouteDecision,
  messages: AIMessage[],
  breaker: CircuitBreaker,
  now: () => number = Date.now,
): Promise<RoutedResponse> {
  const attempts: RoutedResponse["attempts"] = [];
  for (const name of decision.candidates) {
    const entry = providers.find((p) => p.provider.name === name);
    if (!entry || breaker.isOpen(name)) {
      attempts.push({ provider: name, ok: false, error: "circuit_open", latencyMs: 0 });
      continue;
    }
    const started = now();
    try {
      const response = await entry.provider.call(messages);
      breaker.recordSuccess(name);
      attempts.push({ provider: name, ok: true, latencyMs: now() - started });
      return { ...response, mock: entry.mock, attempts, fallbackUsed: name !== decision.primary };
    } catch (error) {
      breaker.recordFailure(name);
      // Only the normalised code is kept: provider messages may echo request content.
      attempts.push({
        provider: name,
        ok: false,
        error: error instanceof ProviderError ? error.code : "provider_error",
        retryable: error instanceof ProviderError ? error.retryable : true,
        latencyMs: now() - started,
      });
    }
  }
  const failure = new Error("all_providers_failed");
  Object.assign(failure, { attempts });
  throw failure;
}
