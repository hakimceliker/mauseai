/**
 * Judge & Evidence Gate Type Definitions
 * B8 Phase - Task completion validation framework
 */

export type JudgmentStatus = "PASS" | "FAIL" | "ESCALATE";

export interface JudgmentCriteria {
  branchCorrect: boolean;
  shaUpdated: boolean;
  ciPassed: boolean;
  testsPassed: boolean;
  evidenceSufficient: boolean;
  independentReviewExists: boolean;
  judgeNotExecutor: boolean;
  dependenciesComplete: boolean;
  humanApprovalProvided: boolean;
  productionProofReal: boolean;
}

export interface Judgment {
  taskId: string;
  status: JudgmentStatus;
  canClose: boolean;
  criteria: JudgmentCriteria;
  failureReasons: string[];
  escalationReason?: string;
  timestamp: Date;
  judgedBy: string;
}

export interface Evidence {
  id: string;
  type: "ci_log" | "test_result" | "deployment_log" | "review" | "approval" | "commit" | "other";
  content: string;
  source: string;
  timestamp: Date;
  isRedacted?: boolean;
  detectedSecrets?: string[];
}

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  secretsDetected: string[];
  redactedContent?: string;
}

export interface JudgmentPolicy {
  name: string;
  description: string;
  requiredCriteria: (keyof JudgmentCriteria)[];
  requiresHumanApproval: boolean;
  autoEscalate: (keyof JudgmentCriteria)[];
}

export interface TaskContext {
  taskId: string;
  executorId: string;
  branch: string;
  sha: string;
  ciStatus: "passed" | "failed" | "pending";
  testStatus: "passed" | "failed" | "pending";
  hasIndependentReview: boolean;
  approvals: string[]; // User IDs of approvers
  dependencies: string[]; // Completed dependency task IDs
  productionProof?: {
    url: string;
    timestamp: Date;
    verified: boolean;
  };
}
