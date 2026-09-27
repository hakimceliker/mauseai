import type { AIRequest, AIResult, AIProviderName } from "./types";

export function chooseMockProvider(riskLevel: string): AIProviderName {
  return riskLevel === "L3" || riskLevel === "L4" ? "mock-claude" : "mock-gpt";
}

export async function routeMockAI(request: AIRequest): Promise<AIResult> {
  const provider = chooseMockProvider(request.riskLevel);
  const output = {
    taskId: request.taskId,
    goal: request.goal,
    plan: ["analyze", "execute", "report"],
    review:
      provider === "mock-claude" ? "risk_review_required" : "standard_review",
  };
  return {
    provider,
    output,
    inputTokens: request.goal.length,
    outputTokens: 32,
    costCents: provider === "mock-claude" ? 2 : 1,
  };
}

export async function routeAI(request: AIRequest): Promise<AIResult> {
  const configuredProvider = (process.env.AI_PROVIDER ?? 'mock').toLowerCase();
  if (configuredProvider === 'mock') return routeMockAI(request);

  const { AIRouter } = await import('./ai-router');
  const response = await AIRouter.execute([
    { role: 'system', content: 'You are a controlled MouseAI task agent. Return concise, actionable results.' },
    { role: 'user', content: request.goal },
  ]);
  const inputTokens = response.tokens_used ?? request.goal.length;
  const outputTokens = response.tokens_used ? Math.max(1, response.tokens_used - inputTokens) : 1;
  return {
    provider: response.provider as AIProviderName,
    output: { taskId: request.taskId, goal: request.goal, response: response.content },
    inputTokens,
    outputTokens,
    costCents: Math.max(1, Math.ceil((response.cost ?? 0) * 100)),
  };
}
