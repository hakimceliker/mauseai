import { z } from "zod";

export enum ErrorType {
  TIMEOUT = "TIMEOUT",
  PROVIDER_FAILURE = "PROVIDER_FAILURE",
  TOOL_FAILURE = "TOOL_FAILURE",
  MODEL_FAILURE = "MODEL_FAILURE",
  PERMISSION_ERROR = "PERMISSION_ERROR",
  CORRUPT_DATA = "CORRUPT_DATA",
  DUPLICATE_TASK = "DUPLICATE_TASK",
  CONFLICTING_RESULT = "CONFLICTING_RESULT",
  STALE_TASK = "STALE_TASK",
  RETRY_LIMIT_EXCEEDED = "RETRY_LIMIT_EXCEEDED",
  HUMAN_ESCALATION_NEEDED = "HUMAN_ESCALATION_NEEDED",
}

export enum RecoveryAction {
  RETRY = "RETRY",
  FALLBACK_AGENT = "FALLBACK_AGENT",
  ESCALATE_HUMAN = "ESCALATE_HUMAN",
  ABORT = "ABORT",
  CHECKPOINT_RESTORE = "CHECKPOINT_RESTORE",
}

export const failureSchema = z.object({
  id: z.string().uuid().describe("Unique failure record identifier"),
  taskId: z.string().uuid().describe("Associated task ID"),
  errorType: z
    .nativeEnum(ErrorType)
    .describe(
      "Error classification: TIMEOUT, PROVIDER_FAILURE, TOOL_FAILURE, MODEL_FAILURE, PERMISSION_ERROR, CORRUPT_DATA, DUPLICATE_TASK, CONFLICTING_RESULT, STALE_TASK, RETRY_LIMIT_EXCEEDED, or HUMAN_ESCALATION_NEEDED"
    ),
  errorMessage: z
    .string()
    .min(1)
    .max(5000)
    .describe("Detailed error message"),
  recoveryAction: z
    .nativeEnum(RecoveryAction)
    .describe(
      "Recovery action: RETRY, FALLBACK_AGENT, ESCALATE_HUMAN, ABORT, or CHECKPOINT_RESTORE"
    ),
  retryAttempt: z
    .number()
    .nonnegative()
    .describe("Current retry attempt number"),
  maxRetryAttempts: z
    .number()
    .nonnegative()
    .describe("Maximum number of retry attempts allowed"),
  recoveryTimestamp: z
    .string()
    .datetime()
    .describe("Timestamp of recovery action"),
  recoverySuccess: z
    .boolean()
    .describe("True if recovery action succeeded"),
  nextAction: z
    .string()
    .max(2000)
    .optional()
    .describe("Description of next action"),
});

export type FailureType = z.infer<typeof failureSchema>;

/**
 * Validates failure record against the schema
 */
export function validateFailure(data: unknown): FailureType {
  return failureSchema.parse(data);
}

/**
 * Safely validates failure record, returning result object
 */
export function validateFailureSafe(
  data: unknown
): z.SafeParseReturnType<unknown, FailureType> {
  return failureSchema.safeParse(data);
}

/**
 * Factory function to create new failure record
 */
export function createFailure(
  input: Omit<FailureType, "id" | "recoveryTimestamp">
): FailureType {
  return failureSchema.parse({
    id: crypto.randomUUID(),
    recoveryTimestamp: new Date().toISOString(),
    ...input,
  });
}

/**
 * Checks if retry limit has been exceeded
 */
export function isRetryLimitExceeded(failure: FailureType): boolean {
  return failure.retryAttempt >= failure.maxRetryAttempts;
}

/**
 * Determines if task should be retried
 * Returns true if retries remain and recovery action is RETRY
 */
export function shouldRetry(failure: FailureType): boolean {
  return (
    !isRetryLimitExceeded(failure) &&
    failure.recoveryAction === RecoveryAction.RETRY
  );
}

/**
 * Determines if human escalation is needed
 */
export function shouldEscalateToHuman(failure: FailureType): boolean {
  return (
    failure.recoveryAction === RecoveryAction.ESCALATE_HUMAN ||
    failure.errorType === ErrorType.HUMAN_ESCALATION_NEEDED ||
    isRetryLimitExceeded(failure)
  );
}

/**
 * Determines if fallback agent should be used
 */
export function shouldUseFallbackAgent(failure: FailureType): boolean {
  return failure.recoveryAction === RecoveryAction.FALLBACK_AGENT;
}

/**
 * Determines if task should be aborted
 */
export function shouldAbort(failure: FailureType): boolean {
  return failure.recoveryAction === RecoveryAction.ABORT;
}

/**
 * Maps error types to recommended recovery actions
 */
export function getRecommendedRecoveryAction(
  errorType: ErrorType
): RecoveryAction {
  const mapping: Record<ErrorType, RecoveryAction> = {
    [ErrorType.TIMEOUT]: RecoveryAction.RETRY,
    [ErrorType.PROVIDER_FAILURE]: RecoveryAction.FALLBACK_AGENT,
    [ErrorType.TOOL_FAILURE]: RecoveryAction.RETRY,
    [ErrorType.MODEL_FAILURE]: RecoveryAction.FALLBACK_AGENT,
    [ErrorType.PERMISSION_ERROR]: RecoveryAction.ESCALATE_HUMAN,
    [ErrorType.CORRUPT_DATA]: RecoveryAction.CHECKPOINT_RESTORE,
    [ErrorType.DUPLICATE_TASK]: RecoveryAction.ABORT,
    [ErrorType.CONFLICTING_RESULT]: RecoveryAction.ESCALATE_HUMAN,
    [ErrorType.STALE_TASK]: RecoveryAction.CHECKPOINT_RESTORE,
    [ErrorType.RETRY_LIMIT_EXCEEDED]: RecoveryAction.ESCALATE_HUMAN,
    [ErrorType.HUMAN_ESCALATION_NEEDED]: RecoveryAction.ESCALATE_HUMAN,
  };

  return mapping[errorType];
}

/**
 * Validates recovery action is appropriate for error type
 */
export function validateRecoveryActionFitsErrorType(
  failure: FailureType
): boolean {
  const recommended = getRecommendedRecoveryAction(failure.errorType);

  // Allow escalation as fallback for any error
  if (failure.recoveryAction === RecoveryAction.ESCALATE_HUMAN) {
    return true;
  }

  // Allow abort as fallback for critical errors
  if (
    failure.recoveryAction === RecoveryAction.ABORT &&
    [
      ErrorType.DUPLICATE_TASK,
      ErrorType.RETRY_LIMIT_EXCEEDED,
      ErrorType.HUMAN_ESCALATION_NEEDED,
    ].includes(failure.errorType)
  ) {
    return true;
  }

  return failure.recoveryAction === recommended;
}

/**
 * Determines if error is retryable
 */
export function isErrorRetryable(errorType: ErrorType): boolean {
  const retryableErrors = [
    ErrorType.TIMEOUT,
    ErrorType.TOOL_FAILURE,
    ErrorType.PROVIDER_FAILURE,
  ];

  return retryableErrors.includes(errorType);
}

/**
 * Determines if error requires human review
 */
export function requiresHumanReview(errorType: ErrorType): boolean {
  const humanReviewErrors = [
    ErrorType.PERMISSION_ERROR,
    ErrorType.CORRUPT_DATA,
    ErrorType.CONFLICTING_RESULT,
    ErrorType.HUMAN_ESCALATION_NEEDED,
  ];

  return humanReviewErrors.includes(errorType);
}
