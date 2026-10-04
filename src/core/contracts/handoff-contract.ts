import { z } from "zod";

export enum HandoffResult {
  SUCCESS = "SUCCESS",
  FAILURE = "FAILURE",
  TIMEOUT = "TIMEOUT",
}

export const handoffSchema = z.object({
  id: z.string().uuid().describe("Unique handoff identifier (UUID)"),
  sourceAgent: z.string().min(1).describe("Source agent ID"),
  targetAgent: z.string().min(1).describe("Target agent ID"),
  taskId: z.string().uuid().describe("Associated task ID"),
  context: z.record(z.unknown()).describe("Task context object"),
  reason: z.string().min(1).max(2000).describe("Reason for handoff"),
  output: z.unknown().optional().describe("Output from source agent"),
  evidenceRef: z
    .string()
    .optional()
    .describe("Link to evidence artifacts"),
  sha: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .describe("Git commit SHA at handoff time"),
  schemaVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .describe("Contract schema version (semver)"),
  timestamp: z.string().datetime().describe("Handoff timestamp"),
  handoffResult: z
    .nativeEnum(HandoffResult)
    .describe("Result of handoff: SUCCESS, FAILURE, or TIMEOUT"),
  resultReason: z
    .string()
    .max(1000)
    .describe("Detailed reason for handoff result"),
});

export type HandoffType = z.infer<typeof handoffSchema>;

/**
 * Validates handoff data against the schema
 */
export function validateHandoff(data: unknown): HandoffType {
  return handoffSchema.parse(data);
}

/**
 * Safely validates handoff data, returning result object
 */
export function validateHandoffSafe(
  data: unknown
): z.SafeParseReturnType<unknown, HandoffType> {
  return handoffSchema.safeParse(data);
}

/**
 * Factory function to create a new handoff with defaults
 */
export function createHandoff(
  input: Omit<HandoffType, "id" | "timestamp" | "schemaVersion">
): HandoffType {
  return handoffSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    schemaVersion: "1.0.0",
    ...input,
  });
}

/**
 * Validates handoff is not circular (source and target are different)
 */
export function validateHandoffNotCircular(handoff: HandoffType): boolean {
  if (handoff.sourceAgent === handoff.targetAgent) {
    throw new Error(
      `Circular handoff detected: agent ${handoff.sourceAgent} cannot hand off to itself`
    );
  }
  return true;
}

/**
 * Validates handoff result status
 */
export function validateHandoffResult(handoff: HandoffType): boolean {
  if (
    handoff.handoffResult === HandoffResult.FAILURE &&
    (!handoff.resultReason || handoff.resultReason.length === 0)
  ) {
    throw new Error(
      "Handoff with FAILURE result must have a detailed resultReason"
    );
  }

  if (
    handoff.handoffResult === HandoffResult.TIMEOUT &&
    (!handoff.resultReason || handoff.resultReason.length === 0)
  ) {
    throw new Error(
      "Handoff with TIMEOUT result must have a detailed resultReason"
    );
  }

  return true;
}

/**
 * Checks if handoff was successful
 */
export function isHandoffSuccessful(handoff: HandoffType): boolean {
  return handoff.handoffResult === HandoffResult.SUCCESS;
}
