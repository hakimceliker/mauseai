import { z } from "zod";

export enum JudgeVerdict {
  PASS = "PASS",
  FAIL = "FAIL",
  ESCALATE = "ESCALATE",
}

export const judgeVerifyCriteriaSchema = z.object({
  branchCorrect: z
    .boolean()
    .describe("Branch naming and structure follow conventions"),
  shaUpdated: z
    .boolean()
    .describe("Code changes include proper git SHA references"),
  ciPassed: z.boolean().describe("All CI checks passed"),
  testsPassed: z.boolean().describe("All tests passed"),
  evidenceSufficient: z
    .boolean()
    .describe("Evidence artifacts are sufficient for verification"),
  independentReviewExists: z
    .boolean()
    .describe("Independent code review has been completed"),
  judgeNotExecutor: z
    .boolean()
    .describe("Judge is different from executor/creator"),
  dependencyComplete: z
    .boolean()
    .describe("All task dependencies are complete"),
  humanApprovalProvided: z
    .boolean()
    .describe("Required human approvals have been obtained"),
  productionProofReal: z
    .boolean()
    .describe("Production proof is verifiable and real"),
});

export const judgeSchema = z.object({
  id: z.string().uuid().describe("Unique judge verdict identifier (UUID)"),
  taskId: z.string().uuid().describe("Task being judged"),
  judgeAgent: z.string().min(1).describe("Judge agent ID"),
  criteria: judgeVerifyCriteriaSchema.describe(
    "Verification criteria and their pass/fail status"
  ),
  verdict: z
    .nativeEnum(JudgeVerdict)
    .describe("Final verdict: PASS, FAIL, or ESCALATE"),
  reason: z
    .string()
    .min(1)
    .max(3000)
    .describe("Detailed reason for the verdict"),
  timestamp: z.string().datetime().describe("Judgment timestamp"),
  canClose: z
    .boolean()
    .describe("True only if all criteria are met and verdict is PASS"),
});

export type JudgeType = z.infer<typeof judgeSchema>;
export type JudgeVerifyCriteria = z.infer<typeof judgeVerifyCriteriaSchema>;

/**
 * Validates judge data against the schema
 */
export function validateJudge(data: unknown): JudgeType {
  return judgeSchema.parse(data);
}

/**
 * Safely validates judge data, returning result object
 */
export function validateJudgeSafe(
  data: unknown
): z.SafeParseReturnType<unknown, JudgeType> {
  return judgeSchema.safeParse(data);
}

/**
 * Factory function to create a new judge verdict
 */
export function createJudge(
  input: Omit<JudgeType, "id" | "timestamp" | "canClose">
): JudgeType {
  const criteria = input.criteria;
  const allCriteriaMet = Object.values(criteria).every((v) => v === true);
  const canClose = allCriteriaMet && input.verdict === JudgeVerdict.PASS;

  return judgeSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    canClose,
    ...input,
  });
}

/**
 * Determines if task can be closed based on judge verdict
 */
export function canCloseTask(judge: JudgeType): boolean {
  return judge.canClose;
}

/**
 * Counts how many criteria are met
 */
export function countMetCriteria(criteria: JudgeVerifyCriteria): number {
  return Object.values(criteria).filter((v) => v === true).length;
}

/**
 * Gets list of failed criteria
 */
export function getFailedCriteria(
  criteria: JudgeVerifyCriteria
): (keyof JudgeVerifyCriteria)[] {
  return Object.entries(criteria)
    .filter(([_, value]) => value === false)
    .map(([key]) => key as keyof JudgeVerifyCriteria);
}

/**
 * Validates verdict consistency
 * If verdict is PASS, all criteria should be met
 * If verdict is FAIL, at least one criterion should fail
 */
export function validateVerdictConsistency(judge: JudgeType): boolean {
  const allCriteriaMet = Object.values(judge.criteria).every((v) => v === true);

  if (judge.verdict === JudgeVerdict.PASS && !allCriteriaMet) {
    throw new Error(
      "Verdict PASS requires all criteria to be met, but some failed: " +
        getFailedCriteria(judge.criteria).join(", ")
    );
  }

  if (judge.verdict === JudgeVerdict.FAIL && allCriteriaMet) {
    throw new Error(
      "Verdict FAIL contradicts all criteria being met. Use PASS instead."
    );
  }

  return true;
}
