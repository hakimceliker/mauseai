import { z } from "zod";

export enum AgentRole {
  ORCHESTRATOR = "ORCHESTRATOR",
  PLANNER = "PLANNER",
  SPECIALIST = "SPECIALIST",
  JUDGE = "JUDGE",
  HUMAN = "HUMAN",
}

export enum DataScope {
  TENANT_ISOLATED = "TENANT_ISOLATED",
  WORKSPACE = "WORKSPACE",
  SYSTEM = "SYSTEM",
}

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export const agentSchema = z.object({
  id: z.string().min(1).describe("Unique agent identifier"),
  name: z.string().min(1).max(500).describe("Agent display name"),
  role: z
    .nativeEnum(AgentRole)
    .describe("Agent role: ORCHESTRATOR, PLANNER, SPECIALIST, JUDGE, or HUMAN"),
  capability: z
    .array(z.string())
    .default([])
    .describe(
      "List of capabilities (e.g., code-review, deploy, incident-response)"
    ),
  toolAllowlist: z
    .array(z.string())
    .default([])
    .describe("Tool IDs permitted for this agent"),
  modelPreference: z.string().min(1).describe("Preferred LLM model ID"),
  dataScope: z
    .nativeEnum(DataScope)
    .describe(
      "Data scope: TENANT_ISOLATED, WORKSPACE, or SYSTEM"
    ),
  writePermission: z.boolean().default(false).describe("Can write to resources"),
  readPermission: z
    .boolean()
    .default(true)
    .describe("Can read from resources"),
  riskLevel: z
    .nativeEnum(RiskLevel)
    .describe("Agent risk level: LOW, MEDIUM, HIGH, or CRITICAL"),
  timeout: z
    .number()
    .positive()
    .describe("Timeout in seconds for agent operations"),
  concurrencyLimit: z
    .number()
    .nonnegative()
    .default(1)
    .describe("Maximum concurrent task executions"),
  fallbackAgent: z
    .string()
    .optional()
    .describe("Agent ID to fall back to if this agent fails"),
  judgeOwner: z
    .string()
    .optional()
    .describe("Agent ID of the judge overseeing this agent"),
  description: z
    .string()
    .max(2000)
    .optional()
    .describe("Agent description and responsibilities"),
});

export type AgentType = z.infer<typeof agentSchema>;

/**
 * Validates agent data against the schema
 */
export function validateAgent(data: unknown): AgentType {
  return agentSchema.parse(data);
}

/**
 * Safely validates agent data, returning result object
 */
export function validateAgentSafe(
  data: unknown
): z.SafeParseReturnType<unknown, AgentType> {
  return agentSchema.safeParse(data);
}

/**
 * Factory function to create a new agent with defaults
 */
export function createAgent(input: Omit<AgentType, "id">): AgentType {
  return agentSchema.parse({
    id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...input,
  });
}

/**
 * Validates agent has required permissions for a task
 */
export function validateAgentPermissions(
  agent: AgentType,
  requiresWrite: boolean
): boolean {
  if (requiresWrite && !agent.writePermission) {
    throw new Error(
      `Agent ${agent.id} does not have write permission required for this task`
    );
  }

  if (!agent.readPermission) {
    throw new Error(
      `Agent ${agent.id} does not have read permission required`
    );
  }

  return true;
}

/**
 * Validates agent can judge (must be JUDGE role)
 */
export function validateAgentCanJudge(agent: AgentType): boolean {
  if (agent.role !== AgentRole.JUDGE) {
    throw new Error(
      `Agent ${agent.id} with role ${agent.role} cannot judge. Only JUDGE role agents can judge.`
    );
  }
  return true;
}

/**
 * Validates agent capabilities include required capability
 */
export function validateAgentHasCapability(
  agent: AgentType,
  requiredCapability: string
): boolean {
  if (!agent.capability.includes(requiredCapability)) {
    throw new Error(
      `Agent ${agent.id} does not have required capability: ${requiredCapability}. Available: ${agent.capability.join(", ")}`
    );
  }
  return true;
}
