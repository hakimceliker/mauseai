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
