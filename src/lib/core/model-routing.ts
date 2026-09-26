import type { AIMessage, AIProvider, AIResponse } from "@/src/lib/ai/providers/base-provider";
import { MockClaudeProvider } from "@/src/lib/ai/providers/mock-claude";
import { MockGPTProvider } from "@/src/lib/ai/providers/mock-gpt";

/**
 * Model routing with fallback (diagram cards CORE — "Model yönlendirme" and
 * S — "Fallback"). Providers are chosen by risk level and remaining budget;
 * a per-provider circuit breaker moves traffic to the next candidate after
 * repeated failures.
 *
 * Only the mock providers are registered: no real model API key exists in
 * this environment, and every response carries `mock: true` so it is never
 * presented as real model output.
 */

export interface RoutedProvider {
  provider: AIProvider;
  mock: boolean;
  /** Estimated cost in cents per 1K tokens, used for budget-aware routing. */
  centsPer1kTokens: number;
  tier: "standard" | "careful";
}

export interface RouteDecision {
  primary: string;
  candidates: string[];
  reason: string;
}

export interface RoutedResponse extends AIResponse {
  mock: boolean;
  attempts: Array<{ provider: string; ok: boolean; error?: string; latencyMs: number }>;
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

export function defaultProviders(): RoutedProvider[] {
  return [
    { provider: new MockGPTProvider(), mock: true, centsPer1kTokens: 1, tier: "standard" },
    { provider: new MockClaudeProvider(), mock: true, centsPer1kTokens: 2, tier: "careful" },
  ];
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
      attempts.push({
        provider: name,
        ok: false,
        error: error instanceof Error ? error.message : "provider_error",
        latencyMs: now() - started,
      });
    }
  }
  const failure = new Error("all_providers_failed");
  Object.assign(failure, { attempts });
  throw failure;
}
