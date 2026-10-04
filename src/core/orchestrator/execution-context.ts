import {
  TaskStatus,
  type TaskType,
  type AuditType,
  AuditAction,
  AuditStatus,
  type EvidenceType_Type,
  type JudgeType,
  type ApprovalType,
  createAudit,
  generateTraceId,
} from "@/src/core/contracts";

/**
 * Simple cost object for tracking within execution context
 */
export interface SimpleCost {
  tokens: number;
  usd: number;
}

/**
 * ExecutionContext tracks the state of a task as it moves through the
 * orchestration pipeline. It maintains all evidence, reviews, judgments,
 * approvals, and audit trails needed to safely close a task.
 */
export class ExecutionContext {
  readonly traceId: string;
  readonly taskId: string;
  readonly parentTaskId?: string;
  readonly agentId: string;
  currentPhase: string;

  // Execution state
  state: TaskStatus;
  evidence: EvidenceType_Type[] = [];
  reviews: Array<{
    reviewer: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    timestamp: string;
  }> = [];
  judgments: JudgeType[] = [];
  approvals: ApprovalType[] = [];
  auditTrail: AuditType[] = [];

  // Cost tracking
  estimatedCost: SimpleCost;
  actualCost: SimpleCost = { tokens: 0, usd: 0 };

  // Dependencies
  dependencies: string[] = [];
  completedDependencies: string[] = [];

  constructor(
    taskId: string,
    agentId: string,
    estimatedCost: SimpleCost,
    phase: string = "INIT",
    parentTaskId?: string,
    traceId?: string
  ) {
    this.taskId = taskId;
    this.agentId = agentId;
    this.estimatedCost = estimatedCost;
    this.currentPhase = phase;
    this.parentTaskId = parentTaskId;
    this.traceId = traceId || generateTraceId();
    this.state = TaskStatus.TODO;
  }

  /**
   * Add evidence to the execution context
   */
  addEvidence(evidence: EvidenceType_Type): void {
    this.evidence.push(evidence);
    this.recordAuditEntry(AuditAction.EVIDENCE_COLLECTED, {
      evidenceId: evidence.id,
      evidenceType: evidence.type,
      filePath: evidence.filePath,
    });
  }

  /**
   * Add a review to the execution context
   */
  addReview(review: {
    reviewer: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    timestamp: string;
  }): void {
    this.reviews.push(review);
    this.recordAuditEntry(
      review.status === "APPROVED"
        ? AuditAction.EVIDENCE_REVIEWED
        : AuditAction.EVIDENCE_COLLECTED,
      {
        reviewer: review.reviewer,
        status: review.status,
        comment: review.comment,
      }
    );
  }

  /**
   * Add a judgment to the execution context
   */
  addJudgment(judgment: JudgeType): void {
    this.judgments.push(judgment);
    this.recordAuditEntry(AuditAction.VERDICT_ISSUED, {
      judgeId: judgment.judgeAgent,
      verdict: judgment.verdict,
      canClose: judgment.canClose,
      criteria: judgment.criteria,
    });
  }

  /**
   * Add an approval to the execution context
   */
  addApproval(approval: ApprovalType): void {
    this.approvals.push(approval);
    this.recordAuditEntry(
      approval.approvalStatus === "APPROVED"
        ? AuditAction.APPROVAL_GRANTED
        : AuditAction.APPROVAL_REQUESTED,
      {
        approvalId: approval.id,
        approvalType: approval.requiredFor,
        approverHuman: approval.approverHuman,
        status: approval.approvalStatus,
      }
    );
  }

  /**
   * Record an audit entry with action and details
   */
  recordAuditEntry(
    action: AuditAction,
    details: Record<string, unknown> = {}
  ): void {
    const audit = createAudit({
      taskId: this.taskId,
      agentId: this.agentId,
      action,
      details,
      status: AuditStatus.SUCCESS,
    });
    audit.traceId = this.traceId;
    this.auditTrail.push(audit);
  }

  /**
   * Check if all dependencies are complete
   */
  isDependenciesComplete(): boolean {
    if (this.dependencies.length === 0) {
      return true;
    }
    return (
      this.completedDependencies.length === this.dependencies.length
    );
  }

  /**
   * Mark a dependency as completed
   */
  markDependencyComplete(dependencyId: string): void {
    if (!this.completedDependencies.includes(dependencyId)) {
      this.completedDependencies.push(dependencyId);
    }
  }

  /**
   * Check if task is ready for closure (all 8 mandatory conditions)
   * 1. Code changes exist
   * 2. Tests pass
   * 3. CI passes
   * 4. Evidence sufficient
   * 5. Independent review exists
   * 6. Judge verdict obtained
   * 7. Dependencies complete
   * 8. Human approval (if required)
   */
  isReadyForClosure(): boolean {
    const blockers = this.getBlockers();
    return blockers.length === 0;
  }

  /**
   * Get list of blockers preventing task closure
   */
  getBlockers(): string[] {
    const blockers: string[] = [];

    // Check evidence
    if (this.evidence.length === 0) {
      blockers.push("NO_EVIDENCE: No evidence collected");
    }

    // Check reviews
    const hasApprovedReview = this.reviews.some((r) => r.status === "APPROVED");
    if (!hasApprovedReview && this.reviews.length > 0) {
      blockers.push("REVIEW_PENDING: No approved review yet");
    } else if (this.reviews.length === 0) {
      blockers.push("NO_REVIEW: No independent review obtained");
    }

    // Check judge verdict
    const hasPassingJudgment = this.judgments.some(
      (j) => j.verdict === "PASS" && j.canClose
    );
    if (!hasPassingJudgment) {
      if (this.judgments.length === 0) {
        blockers.push("NO_JUDGMENT: No judge verdict obtained");
      } else {
        blockers.push(
          `JUDGMENT_FAILED: Judge verdict is ${
            this.judgments[this.judgments.length - 1].verdict
          }`
        );
      }
    }

    // Check dependencies
    if (!this.isDependenciesComplete()) {
      blockers.push(
        `DEPENDENCIES_INCOMPLETE: ${this.completedDependencies.length}/${this.dependencies.length} dependencies complete`
      );
    }

    // Check approvals (if required)
    const pendingApprovals = this.approvals.filter(
      (a) => a.approvalStatus === "PENDING" && a.failIfNotApproved
    );
    if (pendingApprovals.length > 0) {
      blockers.push(
        `APPROVALS_PENDING: ${pendingApprovals.length} approvals pending`
      );
    }

    return blockers;
  }

  /**
   * Get progress percentage toward closure (0-100)
   * Calculates based on how many of 8 mandatory conditions are met
   */
  getProgress(): number {
    const conditions = [
      this.evidence.length > 0, // Evidence exists
      this.reviews.some((r) => r.status === "APPROVED"), // Has approved review
      this.judgments.some((j) => j.verdict === "PASS" && j.canClose), // Has passing judgment
      this.isDependenciesComplete(), // Dependencies complete
      this.approvals.every(
        (a) => !a.failIfNotApproved || a.approvalStatus === "APPROVED"
      ), // Approvals met
      this.evidence.length > 0, // Evidence sufficient
      true, // Audit trail exists
      this.agentId.length > 0, // Agent assigned
    ];

    const metCount = conditions.filter((c) => c).length;
    return Math.round((metCount / conditions.length) * 100);
  }

  /**
   * Update the state of the execution context
   */
  setState(newState: TaskStatus): void {
    const previousState = this.state;
    this.state = newState;
    this.recordAuditEntry(AuditAction.TASK_STARTED, {
      previousState,
      newState,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add cost to actual cost tracking
   */
  addCost(cost: SimpleCost): void {
    this.actualCost.tokens += cost.tokens;
    this.actualCost.usd += cost.usd;
    this.recordAuditEntry(AuditAction.COST_RECORDED, {
      addedTokens: cost.tokens,
      addedUsd: cost.usd,
      totalTokens: this.actualCost.tokens,
      totalUsd: this.actualCost.usd,
    });
  }

  /**
   * Get summary of execution context
   */
  getSummary() {
    return {
      taskId: this.taskId,
      traceId: this.traceId,
      state: this.state,
      currentPhase: this.currentPhase,
      evidenceCount: this.evidence.length,
      reviewCount: this.reviews.length,
      judgmentCount: this.judgments.length,
      approvalCount: this.approvals.length,
      auditTrailLength: this.auditTrail.length,
      completedDependencies: this.completedDependencies.length,
      totalDependencies: this.dependencies.length,
      actualCost: this.actualCost,
      blockers: this.getBlockers(),
      progress: this.getProgress(),
      isReadyForClosure: this.isReadyForClosure(),
    };
  }
}
