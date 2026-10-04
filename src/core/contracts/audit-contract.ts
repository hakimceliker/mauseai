import { z } from "zod";

export enum AuditAction {
  TASK_STARTED = "task_started",
  AGENT_ASSIGNED = "agent_assigned",
  JUDGE_CALLED = "judge_called",
  EVIDENCE_COLLECTED = "evidence_collected",
  EVIDENCE_REVIEWED = "evidence_reviewed",
  APPROVAL_REQUESTED = "approval_requested",
  APPROVAL_GRANTED = "approval_granted",
  HANDOFF_INITIATED = "handoff_initiated",
  HANDOFF_COMPLETED = "handoff_completed",
  VERDICT_ISSUED = "verdict_issued",
  COST_RECORDED = "cost_recorded",
  RETRY_ATTEMPTED = "retry_attempted",
  TASK_BLOCKED = "task_blocked",
  TASK_UNBLOCKED = "task_unblocked",
  HUMAN_ESCALATION = "human_escalation",
  TASK_CLOSED = "task_closed",
}

export enum AuditStatus {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  TIMEOUT = "TIMEOUT",
}

export const auditCostSchema = z.object({
  tokens: z.number().nonnegative(),
  usd: z.number().nonnegative(),
});

export const auditSchema = z.object({
  traceId: z
    .string()
    .min(1)
    .describe("Unique trace ID across entire task execution"),
  timestamp: z.string().datetime().describe("Action timestamp"),
  taskId: z.string().uuid().describe("Associated task ID"),
  agentId: z.string().min(1).describe("Agent ID that performed action"),
  action: z
    .nativeEnum(AuditAction)
    .describe("Action performed (task_started, agent_assigned, etc.)"),
  details: z
    .record(z.unknown())
    .default({})
    .describe("Action-specific details object"),
  cost: auditCostSchema.optional().describe("Cost incurred for this action"),
  provider: z
    .string()
    .optional()
    .describe("LLM provider if applicable (ANTHROPIC, OPENAI, etc.)"),
  model: z
    .string()
    .optional()
    .describe("Model ID if applicable"),
  duration: z
    .number()
    .nonnegative()
    .optional()
    .describe("Action duration in milliseconds"),
  status: z
    .nativeEnum(AuditStatus)
    .describe("Action status: SUCCESS, FAILURE, or TIMEOUT"),
  nextAction: z
    .string()
    .optional()
    .describe("Next planned action"),
});

export type AuditType = z.infer<typeof auditSchema>;

/**
 * Validates audit record against the schema
 */
export function validateAudit(data: unknown): AuditType {
  return auditSchema.parse(data);
}

/**
 * Safely validates audit record, returning result object
 */
export function validateAuditSafe(
  data: unknown
): z.SafeParseReturnType<unknown, AuditType> {
  return auditSchema.safeParse(data);
}

/**
 * Factory function to create new audit record
 */
export function createAudit(
  input: Omit<AuditType, "traceId" | "timestamp">
): AuditType {
  return auditSchema.parse({
    traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...input,
  });
}

/**
 * Generates audit trace ID
 */
export function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates audit trail consistency
 * All records in a trace should have the same traceId and taskId
 */
export function validateAuditTrailConsistency(
  audits: AuditType[]
): boolean {
  if (audits.length === 0) {
    return true;
  }

  const firstTrace = audits[0].traceId;
  const firstTask = audits[0].taskId;

  for (const audit of audits) {
    if (audit.traceId !== firstTrace) {
      throw new Error(
        `Inconsistent trace ID in audit trail. Expected ${firstTrace}, got ${audit.traceId}`
      );
    }

    if (audit.taskId !== firstTask) {
      throw new Error(
        `Inconsistent task ID in audit trail. Expected ${firstTask}, got ${audit.taskId}`
      );
    }
  }

  return true;
}

/**
 * Filters audit records by action type
 */
export function filterAuditByAction(
  audits: AuditType[],
  action: AuditAction
): AuditType[] {
  return audits.filter((a) => a.action === action);
}

/**
 * Filters audit records by agent ID
 */
export function filterAuditByAgent(
  audits: AuditType[],
  agentId: string
): AuditType[] {
  return audits.filter((a) => a.agentId === agentId);
}

/**
 * Calculates total cost from audit trail
 */
export function calculateTotalCost(
  audits: AuditType[]
): { tokens: number; usd: number } {
  return audits.reduce(
    (acc, audit) => ({
      tokens: acc.tokens + (audit.cost?.tokens || 0),
      usd: acc.usd + (audit.cost?.usd || 0),
    }),
    { tokens: 0, usd: 0 }
  );
}

/**
 * Calculates total duration from audit trail
 */
export function calculateTotalDuration(audits: AuditType[]): number {
  return audits.reduce((sum, audit) => sum + (audit.duration || 0), 0);
}
