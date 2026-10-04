import { z } from "zod";

export enum TaskStatus {
  TODO = "TODO",
  WORKING = "WORKING",
  BLOCKED = "BLOCKED",
  REVIEW = "REVIEW",
  PASS = "PASS",
  CLOSED = "CLOSED",
}

export const costObjectSchema = z.object({
  tokens: z.number().nonnegative(),
  usd: z.number().nonnegative(),
});

export const reviewObjectSchema = z.object({
  reviewer: z.string().min(1),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  comment: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const judgeObjectSchema = z.object({
  judgeId: z.string().min(1),
  verdict: z.enum(["PASS", "FAIL", "ESCALATE"]),
  reason: z.string().min(1),
  timestamp: z.string().datetime(),
});

export const taskSchema = z.object({
  id: z.string().uuid().describe("Unique task identifier (UUID)"),
  title: z.string().min(1).max(500).describe("Task title"),
  goal: z
    .string()
    .min(1)
    .max(5000)
    .describe("User's original goal for the task"),
  status: z
    .nativeEnum(TaskStatus)
    .describe(
      "Task status: TODO, WORKING, BLOCKED, REVIEW, PASS, or CLOSED"
    ),
  phaseTarget: z
    .string()
    .regex(/^[A-K](1|2)?$/)
    .describe("Target phase (e.g., A, B1, B2, ..., K)"),
  createdAt: z.string().datetime().describe("Task creation timestamp"),
  updatedAt: z.string().datetime().describe("Last update timestamp"),
  closedAt: z
    .string()
    .datetime()
    .optional()
    .describe("Closure timestamp (only if status === CLOSED)"),
  dependencies: z
    .array(z.string().uuid())
    .default([])
    .describe("Array of dependent task IDs"),
  assignedAgent: z.string().min(1).describe("Assigned agent ID"),
  estimatedCost: costObjectSchema.describe(
    "Estimated cost in tokens and USD"
  ),
  actualCost: costObjectSchema.describe("Actual incurred cost"),
  retryCount: z.number().nonnegative().default(0).describe("Number of retries"),
  maxRetries: z.number().nonnegative().default(3).describe("Maximum retry limit"),
  evidence: z
    .array(z.string())
    .default([])
    .describe("File paths or URLs to evidence artifacts"),
  review: reviewObjectSchema
    .optional()
    .describe("Review information from reviewer"),
  judge: judgeObjectSchema
    .optional()
    .describe("Judge verdict information"),
  humanApprovalRequired: z
    .boolean()
    .default(false)
    .describe("Whether human approval is required to close"),
  humanApprovalStatus: z
    .enum(["NONE", "PENDING", "APPROVED", "REJECTED"])
    .default("NONE")
    .describe("Current human approval status"),
  blockerReason: z
    .string()
    .optional()
    .describe("Reason why task is BLOCKED"),
  output: z.unknown().optional().describe("Task execution output"),
  auditTraceId: z.string().min(1).describe("Audit trace ID for this task"),
});

export type TaskType = z.infer<typeof taskSchema>;

/**
 * Validates task data against the schema
 */
export function validateTask(data: unknown): TaskType {
  return taskSchema.parse(data);
}

/**
 * Safely validates task data, returning result object
 */
export function validateTaskSafe(
  data: unknown
): z.SafeParseReturnType<unknown, TaskType> {
  return taskSchema.safeParse(data);
}

/**
 * Factory function to create a new task with defaults
 */
export function createTask(
  input: Omit<TaskType, "createdAt" | "updatedAt" | "actualCost">
): TaskType {
  const now = new Date().toISOString();
  return taskSchema.parse({
    ...input,
    createdAt: now,
    updatedAt: now,
    actualCost: { tokens: 0, usd: 0 },
  });
}

/**
 * Validates that task can be closed
 * Throws error if blockers exist
 */
export function validateTaskCanClose(task: TaskType): boolean {
  if (task.status === TaskStatus.BLOCKED && task.blockerReason) {
    throw new Error(`Cannot close blocked task: ${task.blockerReason}`);
  }

  if (
    task.humanApprovalRequired &&
    task.humanApprovalStatus !== "APPROVED"
  ) {
    throw new Error(
      `Cannot close task without human approval. Current status: ${task.humanApprovalStatus}`
    );
  }

  if (task.dependencies.length > 0) {
    throw new Error(
      "Cannot close task with pending dependencies. Please check dependent task completion."
    );
  }

  return true;
}

/**
 * Validates that all evidence is present and sufficient
 */
export function validateTaskEvidence(task: TaskType): boolean {
  if (task.status === TaskStatus.REVIEW || task.status === TaskStatus.PASS) {
    if (!task.evidence || task.evidence.length === 0) {
      throw new Error(
        "Task in REVIEW or PASS status must have evidence artifacts"
      );
    }
  }
  return true;
}
