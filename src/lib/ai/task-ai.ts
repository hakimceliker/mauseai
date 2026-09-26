import { mocksAllowed, type Env } from "@/src/lib/config/runtime";
import { callWithFallback, CircuitBreaker, decideRoute, type RoutedProvider } from "@/src/lib/core/model-routing";
import { routeMockAI } from "./mock-router";
import { buildProviders } from "./provider-registry";
import type { AIRequest, AIResult } from "./types";

/**
 * Task worker AI step (served `task.execute` flow). Uses the real provider
 * registry; the deterministic mock result is only produced in
 * test/development when no real provider is configured.
 */

const breaker = new CircuitBreaker();

export async function routeTaskAI(
  request: AIRequest,
  deps: { env?: Env; providers?: RoutedProvider[] } = {},
): Promise<AIResult> {
  const env = deps.env ?? process.env;
  const providers = deps.providers ?? buildProviders(env);
  if (providers.every((p) => p.mock) && mocksAllowed(env)) return routeMockAI(request);

  const messages = [
    {
      role: "system" as const,
      content:
        "You are the MouseAI task planner. Reply with a short numbered plan (3-7 steps) for the goal, then one line starting with 'Review:' naming the main risk.",
    },
    { role: "user" as const, content: `Risk level: ${request.riskLevel}\nGoal: ${request.goal}` },
  ];
  const estimatedTokens = Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4) + 512;
  const route = decideRoute(providers, { riskLevel: request.riskLevel, remainingBudgetCents: null, estimatedTokens });
  const response = await callWithFallback(providers, route, messages, breaker);
  const entry = providers.find((p) => p.provider.name === response.provider)!;
  const usage = response.usage ?? { inputTokens: estimatedTokens, outputTokens: 0 };
  const plan = response.content
    .split("\n")
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((l) => l && !/^review:/i.test(l));
  const reviewLine = response.content.split("\n").find((l) => /^review:/i.test(l.trim()));
  return {
    provider: response.provider,
    output: {
      taskId: request.taskId,
      goal: request.goal,
      plan,
      review: reviewLine ? reviewLine.replace(/^\s*review:\s*/i, "") : "standard_review",
      model: response.model ?? entry.model ?? null,
      mock: response.mock,
      fallbackUsed: response.fallbackUsed,
    },
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    costCents: entry.costFor ? entry.costFor(usage) : Math.max(1, Math.ceil((entry.centsPer1kTokens * estimatedTokens) / 1000)),
  };
}
