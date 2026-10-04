import { z } from "zod";

export enum CostProvider {
  OPENAI = "OPENAI",
  ANTHROPIC = "ANTHROPIC",
  LOCAL_OLLAMA = "LOCAL_OLLAMA",
  AZURE = "AZURE",
  OTHER = "OTHER",
}

export const costBreakdownSchema = z.object({
  input: z.number().nonnegative().default(0).describe("Input token cost"),
  output: z.number().nonnegative().default(0).describe("Output token cost"),
  other: z.number().nonnegative().default(0).describe("Other fees"),
});

export const costSchema = z.object({
  id: z.string().uuid().describe("Unique cost record identifier"),
  taskId: z.string().uuid().describe("Associated task ID"),
  timestamp: z.string().datetime().describe("Cost incurrence timestamp"),
  provider: z
    .nativeEnum(CostProvider)
    .describe("LLM provider: OPENAI, ANTHROPIC, LOCAL_OLLAMA, AZURE, or OTHER"),
  model: z.string().min(1).describe("Model ID used"),
  tokenCount: z.number().nonnegative().describe("Total token count"),
  costUsd: z
    .number()
    .nonnegative()
    .describe("Cost in USD for this operation"),
  costBreakdown: costBreakdownSchema.describe(
    "Cost breakdown by input, output, and other fees"
  ),
  totalTaskCost: z
    .number()
    .nonnegative()
    .describe("Sum of all costs for the task so far"),
  budgetRemaining: z
    .number()
    .nonnegative()
    .describe("Remaining budget for the task"),
  budgetLimit: z
    .number()
    .nonnegative()
    .describe("Total budget limit for the task"),
  budgetAlertTriggered: z
    .boolean()
    .default(false)
    .describe("True if cost exceeded threshold alert was triggered"),
});

export type CostType = z.infer<typeof costSchema>;

/**
 * Validates cost record against the schema
 */
export function validateCost(data: unknown): CostType {
  return costSchema.parse(data);
}

/**
 * Safely validates cost record, returning result object
 */
export function validateCostSafe(
  data: unknown
): z.SafeParseReturnType<unknown, CostType> {
  return costSchema.safeParse(data);
}

/**
 * Factory function to create new cost record
 */
export function createCost(input: Omit<CostType, "id" | "timestamp">): CostType {
  return costSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  });
}

/**
 * Checks if budget is exceeded
 */
export function isBudgetExceeded(cost: CostType): boolean {
  return cost.budgetRemaining < 0;
}

/**
 * Checks if cost is within budget threshold
 * Warning threshold is 80% of budget
 */
export function shouldTriggerBudgetAlert(cost: CostType): boolean {
  const percentUsed = (cost.totalTaskCost / cost.budgetLimit) * 100;
  return percentUsed >= 80;
}

/**
 * Calculates cost per token
 */
export function calculateCostPerToken(cost: CostType): number {
  if (cost.tokenCount === 0) return 0;
  return cost.costUsd / cost.tokenCount;
}

/**
 * Validates budget constraints
 * Throws error if budget would be exceeded
 */
export function validateBudgetConstraint(
  currentTotal: number,
  newCost: number,
  budgetLimit: number
): boolean {
  const newTotal = currentTotal + newCost;

  if (newTotal > budgetLimit) {
    throw new Error(
      `Budget exceeded: current total $${currentTotal.toFixed(2)} + new cost $${newCost.toFixed(2)} exceeds limit $${budgetLimit.toFixed(2)}`
    );
  }

  return true;
}

/**
 * Calculates remaining budget after a cost
 */
export function calculateRemainingBudget(
  budgetLimit: number,
  currentTotal: number,
  newCost: number
): number {
  return budgetLimit - (currentTotal + newCost);
}

/**
 * Formats cost for display
 */
export function formatCost(costUsd: number): string {
  return `$${costUsd.toFixed(4)}`;
}

/**
 * Aggregates costs by provider
 */
export function aggregateCostsByProvider(
  costs: CostType[]
): Record<CostProvider, number> {
  const aggregated: Record<string, number> = {};

  for (const cost of costs) {
    aggregated[cost.provider] = (aggregated[cost.provider] || 0) + cost.costUsd;
  }

  return aggregated as Record<CostProvider, number>;
}

/**
 * Aggregates costs by model
 */
export function aggregateCostsByModel(
  costs: CostType[]
): Record<string, number> {
  const aggregated: Record<string, number> = {};

  for (const cost of costs) {
    aggregated[cost.model] = (aggregated[cost.model] || 0) + cost.costUsd;
  }

  return aggregated;
}
