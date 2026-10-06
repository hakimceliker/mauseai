import { z } from "zod";

export enum EvidenceType {
  CI_LOG = "CI_LOG",
  TEST_RESULT = "TEST_RESULT",
  CODE_REVIEW = "CODE_REVIEW",
  DEPLOYMENT_LOG = "DEPLOYMENT_LOG",
  PILOT_DATA = "PILOT_DATA",
  SECURITY_SCAN = "SECURITY_SCAN",
  PERFORMANCE_METRIC = "PERFORMANCE_METRIC",
}

export const evidenceMetadataSchema = z.record(z.unknown()).optional();

export const evidenceSchema = z.object({
  id: z.string().uuid().describe("Unique evidence identifier (UUID)"),
  taskId: z.string().uuid().describe("Associated task ID"),
  type: z
    .nativeEnum(EvidenceType)
    .describe(
      "Evidence type: CI_LOG, TEST_RESULT, CODE_REVIEW, DEPLOYMENT_LOG, PILOT_DATA, SECURITY_SCAN, or PERFORMANCE_METRIC"
    ),
  filePath: z
    .string()
    .min(1)
    .describe("Path to evidence file (local or remote URL)"),
  sha: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .describe("Git commit SHA of referenced code"),
  timestamp: z.string().datetime().describe("Evidence creation/collection timestamp"),
  metadata: evidenceMetadataSchema.describe(
    "Type-specific metadata (test count, pass rate, etc.)"
  ),
  redacted: z
    .boolean()
    .default(false)
    .describe("True if sensitive data has been removed"),
  reviewedBy: z
    .string()
    .optional()
    .describe("Reviewer ID if evidence has been reviewed"),
  judgmentRef: z
    .string()
    .optional()
    .describe("Judge ID that used this evidence in judgment"),
});

export type EvidenceType_Type = z.infer<typeof evidenceSchema>;

/**
 * Validates evidence data against the schema
 */
export function validateEvidence(data: unknown): EvidenceType_Type {
  return evidenceSchema.parse(data);
}

/**
 * Safely validates evidence data, returning result object
 */
export function validateEvidenceSafe(
  data: unknown
): z.SafeParseReturnType<unknown, EvidenceType_Type> {
  return evidenceSchema.safeParse(data);
}

/**
 * Factory function to create new evidence
 */
export function createEvidence(
  input: Omit<EvidenceType_Type, "id" | "timestamp">
): EvidenceType_Type {
  return evidenceSchema.parse({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  });
}

/**
 * Checks if evidence should be redacted
 * Redacts by default for logs and security scans to protect sensitive data
 */
export function shouldRedactEvidence(
  evidenceType: EvidenceType,
  containsSensitiveData: boolean = false
): boolean {
  const sensitiveTypes = [
    EvidenceType.CI_LOG,
    EvidenceType.DEPLOYMENT_LOG,
    EvidenceType.SECURITY_SCAN,
  ];

  return sensitiveTypes.includes(evidenceType) || containsSensitiveData;
}

/**
 * Validates evidence is sufficient for phase
 * Different phases require different evidence types
 */
export function validateEvidenceSufficiency(
  evidenceList: EvidenceType_Type[],
  phaseTarget: string
): boolean {
  const types = evidenceList.map((e) => e.type);

  // Critical phases require multiple evidence types
  if (phaseTarget.startsWith("K")) {
    // Production phase
    const requiredTypes = [
      EvidenceType.TEST_RESULT,
      EvidenceType.DEPLOYMENT_LOG,
      EvidenceType.PILOT_DATA,
    ];

    for (const required of requiredTypes) {
      if (!types.includes(required)) {
        throw new Error(
          `Production phase requires ${required} evidence. Missing.`
        );
      }
    }
  }

  return true;
}

/**
 * Checks if evidence has been properly reviewed
 */
export function isEvidenceReviewed(evidence: EvidenceType_Type): boolean {
  return !!evidence.reviewedBy;
}

/**
 * Checks if evidence is suitable for judgment
 */
export function canUseForJudgment(evidence: EvidenceType_Type): boolean {
  // Evidence must not be redacted to be used for judgment
  if (evidence.redacted) {
    return false;
  }

  // Evidence should ideally be reviewed
  return isEvidenceReviewed(evidence);
}
