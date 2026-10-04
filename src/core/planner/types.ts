import { TaskType, AgentType, ApprovalRequiredFor } from "../contracts/index";
import { DependencyGraph } from "./dependency-graph";
import { RiskAssessment } from "./plan-validator";

/**
 * Cost estimate structure
 */
export interface CostEstimate {
  totalTokens: number;
  totalUsd: number;
  costPerTask: Record<string, { tokens: number; usd: number }>;
  contingency: number; // 15% buffer
  breakdown: {
    base: number;
    contingency: number;
    total: number;
  };
}

/**
 * Duration estimate structure
 */
export interface DurationEstimate {
  criticalPathLength: number;
  estimatedMinutes: number;
  estimatedSeconds: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  parallelizableTasks: string[];
}

/**
 * Approval gate requirement
 */
export interface ApprovalGate {
  id: string;
  taskId: string;
  requiredFor: ApprovalRequiredFor;
  requesterAgent: string;
  approverHuman: string;
  failIfNotApproved: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

/**
 * Plan validation result
 */
export interface PlanValidationResult {
  isValid: boolean;
  completenessOk: boolean;
  feasibilityOk: boolean;
  budgetOk: boolean;
  timelineOk: boolean;
  riskAssessment: RiskAssessment;
  issues: string[];
  warnings: string[];
  approvalGatesRequired: ApprovalGate[];
}

/**
 * Plan constraints
 */
export interface PlanConstraints {
  maxTasks?: number;
  budgetLimit?: number;
  timelineDeadline?: Date;
  allowedRiskLevels?: string[];
  requireApprovals?: boolean;
  parallelizationEnabled?: boolean;
}

/**
 * Complete plan structure
 */
export interface Plan {
  id: string;
  goal: string;
  tasks: TaskType[];
  dependencyGraph: DependencyGraph;
  agentAssignments: Map<string, string>; // taskId → agentId
  costEstimate: CostEstimate;
  durationEstimate: DurationEstimate;
  approvalGates: ApprovalGate[];
  validationResult: PlanValidationResult;
  createdAt: string;
  createdBy: string; // agent ID
  auditTraceId: string;
}

/**
 * Decomposition candidate (used internally during planning)
 */
export interface DecompositionCandidate {
  tasks: TaskType[];
  dependencies: Array<{ taskId: string; dependsOn: string[] }>;
  score: number;
  reasoning: string;
  estimatedCost: CostEstimate;
  estimatedDuration: DurationEstimate;
}

/**
 * Goal parse result
 */
export interface ParsedGoal {
  intent: string;
  scope: string;
  requiredCapabilities: string[];
  riskIndicators: string[];
  constraints: PlanConstraints;
}
