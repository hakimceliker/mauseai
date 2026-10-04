import { z } from "zod";

export enum ApprovalRequiredFor {
  PRODUCTION_DEPLOY = "PRODUCTION_DEPLOY",
  DNS_CHANGE = "DNS_CHANGE",
  SECRET_UPDATE = "SECRET_UPDATE",
  PAYMENT = "PAYMENT",
  CRITICAL_MERGE = "CRITICAL_MERGE",
  BRANCH_DELETE = "BRANCH_DELETE",
  FORCE_PUSH = "FORCE_PUSH",
  DATA_CHANGE = "DATA_CHANGE",
}

export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export const approvalSchema = z.object({
  id: z.string().uuid().describe("Unique approval request identifier"),
  taskId: z.string().uuid().describe("Associated task ID"),
  requiredFor: z
    .nativeEnum(ApprovalRequiredFor)
    .describe(
      "Approval type: PRODUCTION_DEPLOY, DNS_CHANGE, SECRET_UPDATE, PAYMENT, CRITICAL_MERGE, BRANCH_DELETE, FORCE_PUSH, or DATA_CHANGE"
    ),
  requesterAgent: z
    .string()
    .min(1)
    .describe("Agent ID requesting approval"),
  approverHuman: z
    .string()
    .email()
    .or(z.string().min(1))
    .describe("Email or ID of required human approver"),
  approvalStatus: z
    .nativeEnum(ApprovalStatus)
    .describe("Current approval status: PENDING, APPROVED, or REJECTED"),
  approvalTimestamp: z
    .string()
    .datetime()
    .optional()
    .describe("Timestamp of approval/rejection decision"),
  reason: z
    .string()
    .max(2000)
    .optional()
    .describe("Reason for approval or rejection"),
  failIfNotApproved: z
    .boolean()
    .default(true)
    .describe(
      "If true, task/action must fail if approval is not granted by deadline"
    ),
});

export type ApprovalType = z.infer<typeof approvalSchema>;

/**
 * Validates approval request against the schema
 */
export function validateApproval(data: unknown): ApprovalType {
  return approvalSchema.parse(data);
}

/**
 * Safely validates approval request, returning result object
 */
export function validateApprovalSafe(
  data: unknown
): z.SafeParseReturnType<unknown, ApprovalType> {
  return approvalSchema.safeParse(data);
}

/**
 * Factory function to create new approval request
 */
export function createApproval(
  input: Omit<ApprovalType, "id">
): ApprovalType {
  return approvalSchema.parse({
    id: crypto.randomUUID(),
    ...input,
  });
}

/**
 * Checks if approval is pending
 */
export function isApprovalPending(approval: ApprovalType): boolean {
  return approval.approvalStatus === ApprovalStatus.PENDING;
}

/**
 * Checks if approval is granted
 */
export function isApprovalGranted(approval: ApprovalType): boolean {
  return approval.approvalStatus === ApprovalStatus.APPROVED;
}

/**
 * Checks if approval is rejected
 */
export function isApprovalRejected(approval: ApprovalType): boolean {
  return approval.approvalStatus === ApprovalStatus.REJECTED;
}

/**
 * Validates approval can proceed
 * If failIfNotApproved is true and status is not APPROVED, throw error
 */
export function validateApprovalProceed(approval: ApprovalType): boolean {
  if (
    approval.failIfNotApproved &&
    approval.approvalStatus !== ApprovalStatus.APPROVED
  ) {
    throw new Error(
      `Approval required for ${approval.requiredFor} is not granted. Current status: ${approval.approvalStatus}`
    );
  }

  return true;
}

/**
 * Approves a request (marks as APPROVED with timestamp and optional reason)
 */
export function approveRequest(
  approval: ApprovalType,
  reason?: string
): ApprovalType {
  return approvalSchema.parse({
    ...approval,
    approvalStatus: ApprovalStatus.APPROVED,
    approvalTimestamp: new Date().toISOString(),
    reason: reason || approval.reason,
  });
}

/**
 * Rejects a request (marks as REJECTED with timestamp and reason)
 */
export function rejectRequest(
  approval: ApprovalType,
  reason: string
): ApprovalType {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  return approvalSchema.parse({
    ...approval,
    approvalStatus: ApprovalStatus.REJECTED,
    approvalTimestamp: new Date().toISOString(),
    reason,
  });
}

/**
 * Gets high-risk approval types that should always require human review
 */
export function isHighRiskApproval(requiredFor: ApprovalRequiredFor): boolean {
  const highRisk = [
    ApprovalRequiredFor.PRODUCTION_DEPLOY,
    ApprovalRequiredFor.FORCE_PUSH,
    ApprovalRequiredFor.SECRET_UPDATE,
    ApprovalRequiredFor.PAYMENT,
  ];

  return highRisk.includes(requiredFor);
}
