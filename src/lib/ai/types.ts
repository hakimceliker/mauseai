export type AIProviderName = "mock-gpt" | "mock-claude";

export type AIRequest = {
  taskId: string;
  goal: string;
  riskLevel: string;
};

export type AIResult = {
  provider: AIProviderName;
  output: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
};
