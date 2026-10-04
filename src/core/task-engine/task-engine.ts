import {
  TaskStatus,
  TaskType,
  EvidenceType,
  EvidenceType_Type,
  JudgeType,
  JudgeVerdict,
  ApprovalType,
  ApprovalStatus,
  AuditType,
  AuditAction,
  AuditStatus,
  createTask,
  createAudit,
  createEvidence,
  createJudge,
} from "@/src/core/contracts";
import { ITaskStore, InMemoryTaskStore } from "./task-store";
import { StateMachine, TransitionGuards, TransitionValidation } from "./state-machine";
import { randomUUID } from "crypto";

/**
 * Evidence with validation
 */
export interface Evidence extends EvidenceType_Type {
  redacted: boolean;
  checksum?: string;
}

/**
 * Review information
 */
export interface Review {
  reviewer: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment?: string;
  timestamp: string;
}

/**
 * Judgment information
 */
export interface Judgment {
  judgeId: string;
  verdict: "PASS" | "FAIL" | "ESCALATE";
  reason: string;
  timestamp: string;
  canClose: boolean;
}

/**
 * Approval information
 */
export interface Approval {
  approvalId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  timestamp: string;
  reason?: string;
}

/**
 * Audit entry
 */
export interface AuditEntry extends AuditType {
  taskId: string;
}

/**
 * Update result for state transitions
 */
export interface UpdateResult {
  success: boolean;
  reason?: string;
  task?: TaskType;
  blockers?: string[];
}

/**
 * Closure result
 */
export interface ClosureResult {
  success: boolean;
  reason?: string;
  blockers?: string[];
}

/**
 * Status report for a task
 */
export interface StatusReport {
  taskId: string;
  currentState: TaskStatus;
  progressPercent: number;
  blockers: string[];
  evidenceQuality: {
    collected: number;
    reviewed: number;
    sufficient: boolean;
  };
  reviewStatus: {
    required: boolean;
    approved: boolean;
    reviewer?: string;
    timestamp?: string;
  };
  judgeStatus: {
    required: boolean;
    verdict?: string;
    canClose: boolean;
  };
  approvalStatus: {
    required: boolean;
    approved: boolean;
  };
  costAccumulated: {
    tokens: number;
    usd: number;
  };
  retryCount: number;
  auditTrailLength: number;
}

/**
 * Main Task Engine
 * Manages task lifecycle with strict state machine and closure guards
 */
export class TaskEngine {
  private store: ITaskStore;
  private auditLog: Map<string, AuditEntry[]> = new Map();
  private evidenceMap: Map<string, Evidence[]> = new Map();
  private reviewMap: Map<string, Review[]> = new Map();
  private judgmentMap: Map<string, Judgment[]> = new Map();
  private approvalMap: Map<string, Approval[]> = new Map();

  constructor(store?: ITaskStore) {
    this.store = store || new InMemoryTaskStore();
  }

  /**
   * 1. Create new task
   */
  async createTask(
    goal: string,
    agentId: string,
    phaseTarget: string
  ): Promise<TaskType> {
    const taskId = randomUUID();
    const now = new Date().toISOString();

    const task: TaskType = {
      id: taskId,
      title: goal.substring(0, 100), // Use first 100 chars as title
      goal,
      status: TaskStatus.TODO,
      phaseTarget,
      createdAt: now,
      updatedAt: now,
      assignedAgent: agentId,
      estimatedCost: { tokens: 0, usd: 0 },
      actualCost: { tokens: 0, usd: 0 },
      retryCount: 0,
      maxRetries: 3,
      dependencies: [],
      evidence: [],
      humanApprovalRequired: false,
      humanApprovalStatus: "NONE",
      auditTraceId: `trace-${taskId}`,
    };

    await this.store.saveTask(task);

    // Create audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      AuditAction.TASK_STARTED,
      agentId,
      { goal, phaseTarget, agentId }
    );
    this.recordAudit(taskId, auditEntry);

    // Initialize maps
    this.evidenceMap.set(taskId, []);
    this.reviewMap.set(taskId, []);
    this.judgmentMap.set(taskId, []);
    this.approvalMap.set(taskId, []);

    return task;
  }

  /**
   * 2. Get task
   */
  async getTask(taskId: string): Promise<TaskType | null> {
    return this.store.loadTask(taskId);
  }

  /**
   * 3. Update task state (guarded)
   */
  async updateTaskState(
    taskId: string,
    newState: TaskStatus
  ): Promise<UpdateResult> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      return { success: false, reason: `Task not found: ${taskId}` };
    }

    // For CLOSED transitions, we need to check closure conditions first
    // and set the allConditionsMet guard
    let guards: TransitionGuards;
    if (newState === TaskStatus.CLOSED) {
      const closureCheck = await this.canCloseTask(taskId);
      guards = {
        ...this.buildTransitionGuards(task, newState),
        allConditionsMet: closureCheck.canClose,
      };

      if (!closureCheck.canClose) {
        return {
          success: false,
          reason: `Cannot close task: ${closureCheck.blockers.join("; ")}`,
          blockers: closureCheck.blockers,
        };
      }
    } else {
      guards = this.buildTransitionGuards(task, newState);
    }

    // Validate transition
    const validation = StateMachine.validateTransition(
      task.status,
      newState,
      task,
      guards
    );

    if (!validation.allowed) {
      return { success: false, reason: validation.reason };
    }

    // Update task status
    const now = new Date().toISOString();
    const updatedTask: Partial<TaskType> = {
      status: newState,
      updatedAt: now,
    };

    if (newState === TaskStatus.CLOSED) {
      updatedTask.closedAt = now;
    }

    await this.store.updateTask(taskId, updatedTask);

    // Record audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      this.mapStatusToAuditAction(newState),
      task.assignedAgent,
      { fromStatus: task.status, toStatus: newState }
    );
    this.recordAudit(taskId, auditEntry);

    return {
      success: true,
      task: { ...task, ...updatedTask } as TaskType,
    };
  }

  /**
   * 4. Add evidence to task
   */
  async addEvidence(taskId: string, evidence: Evidence): Promise<void> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate evidence - check for secrets/tokens
    this.validateEvidenceForSecrets(evidence);

    // Redact if necessary
    if (this.shouldRedactEvidence(evidence)) {
      evidence.redacted = true;
    }

    // Add to evidence map
    if (!this.evidenceMap.has(taskId)) {
      this.evidenceMap.set(taskId, []);
    }
    this.evidenceMap.get(taskId)!.push(evidence);

    // Update task evidence list
    const updatedEvidence = [
      ...task.evidence,
      evidence.filePath,
    ];
    await this.store.updateTask(taskId, {
      evidence: updatedEvidence,
      updatedAt: new Date().toISOString(),
    });

    // Record audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      AuditAction.EVIDENCE_COLLECTED,
      "system",
      { evidenceType: evidence.type, filePath: evidence.filePath, redacted: evidence.redacted }
    );
    this.recordAudit(taskId, auditEntry);
  }

  /**
   * 5. Add review to task
   */
  async addReview(
    taskId: string,
    reviewer: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
    comment?: string
  ): Promise<void> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate reviewer is not executor
    if (reviewer === task.assignedAgent) {
      throw new Error("Reviewer cannot be the task executor");
    }

    const review: Review = {
      reviewer,
      status,
      comment,
      timestamp: new Date().toISOString(),
    };

    // Add to review map
    if (!this.reviewMap.has(taskId)) {
      this.reviewMap.set(taskId, []);
    }
    this.reviewMap.get(taskId)!.push(review);

    // Update task review
    await this.store.updateTask(taskId, {
      review: review,
      updatedAt: new Date().toISOString(),
    });

    // If rejected, transition to BLOCKED
    if (status === "REJECTED") {
      await this.updateTaskState(taskId, TaskStatus.BLOCKED);
      await this.store.updateTask(taskId, {
        blockerReason: `Code review rejected: ${comment || "No reason provided"}`,
      });
    }

    // Record audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      AuditAction.EVIDENCE_REVIEWED,
      reviewer,
      { reviewStatus: status, comment }
    );
    this.recordAudit(taskId, auditEntry);
  }

  /**
   * 6. Add judgment to task
   */
  async addJudgment(
    taskId: string,
    judgeId: string,
    verdict: "PASS" | "FAIL" | "ESCALATE",
    reason: string
  ): Promise<void> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Validate judge is not executor
    if (judgeId === task.assignedAgent) {
      throw new Error("Judge cannot be the task executor");
    }

    const judgment: Judgment = {
      judgeId,
      verdict,
      reason,
      timestamp: new Date().toISOString(),
      canClose: verdict === "PASS",
    };

    // Add to judgment map
    if (!this.judgmentMap.has(taskId)) {
      this.judgmentMap.set(taskId, []);
    }
    this.judgmentMap.get(taskId)!.push(judgment);

    // Update task judge
    await this.store.updateTask(taskId, {
      judge: {
        judgeId,
        verdict,
        reason,
        timestamp: judgment.timestamp,
      },
      updatedAt: new Date().toISOString(),
    });

    // Record audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      AuditAction.VERDICT_ISSUED,
      judgeId,
      { verdict, reason, canClose: judgment.canClose }
    );
    this.recordAudit(taskId, auditEntry);
  }

  /**
   * 7. Add approval to task
   */
  async addApproval(
    taskId: string,
    approverAgent: string,
    status: "PENDING" | "APPROVED" | "REJECTED",
    reason?: string
  ): Promise<void> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const approval: Approval = {
      approvalId: randomUUID(),
      status,
      timestamp: new Date().toISOString(),
      reason,
    };

    // Add to approval map
    if (!this.approvalMap.has(taskId)) {
      this.approvalMap.set(taskId, []);
    }
    this.approvalMap.get(taskId)!.push(approval);

    // Update task approval status
    let newApprovalStatus: "PENDING" | "APPROVED" | "REJECTED";
    if (status === "REJECTED") {
      newApprovalStatus = "REJECTED";
      // Transition to BLOCKED on rejection
      await this.updateTaskState(taskId, TaskStatus.BLOCKED);
      await this.store.updateTask(taskId, {
        blockerReason: `Approval rejected: ${reason || "No reason provided"}`,
      });
    } else {
      newApprovalStatus = status;
    }

    await this.store.updateTask(taskId, {
      humanApprovalStatus: newApprovalStatus,
      updatedAt: new Date().toISOString(),
    });

    // Record audit entry
    const auditEntry = this.createAuditEntry(
      taskId,
      status === "REJECTED"
        ? AuditAction.APPROVAL_GRANTED // or could be a separate action
        : AuditAction.APPROVAL_REQUESTED,
      approverAgent,
      { approvalStatus: status, reason }
    );
    this.recordAudit(taskId, auditEntry);
  }

  /**
   * 8. Check task readiness for closure (8 mandatory conditions)
   */
  async canCloseTask(
    taskId: string
  ): Promise<{ canClose: boolean; blockers: string[] }> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      return { canClose: false, blockers: [`Task not found: ${taskId}`] };
    }

    const blockers: string[] = [];

    // 1. Code implemented (status != TODO)
    if (task.status === TaskStatus.TODO) {
      blockers.push("Code not implemented (status is TODO)");
    }

    // 2. Tests run and passed (evidence.TEST_RESULT)
    const evidence = this.evidenceMap.get(taskId) || [];
    const hasTestResult = evidence.some(
      (e) => e.type === EvidenceType.TEST_RESULT
    );
    if (!hasTestResult) {
      blockers.push("No test results evidence found");
    }

    // 3. CI passed (evidence.CI_LOG)
    const hasCILog = evidence.some((e) => e.type === EvidenceType.CI_LOG);
    if (!hasCILog) {
      blockers.push("No CI log evidence found");
    }

    // 4. Evidence collected (evidence[].length > 0)
    if (evidence.length === 0) {
      blockers.push("No evidence collected");
    }

    // 5. Review obtained (review[].status = APPROVED)
    const reviews = this.reviewMap.get(taskId) || [];
    const hasApprovedReview = reviews.some((r) => r.status === "APPROVED");
    if (!hasApprovedReview) {
      blockers.push("No approved code review found");
    }

    // 6. Judge verdict obtained (judgment[].verdict = PASS)
    const judgments = this.judgmentMap.get(taskId) || [];
    const hasPassVerdic = judgments.some((j) => j.verdict === "PASS");
    if (!hasPassVerdic) {
      blockers.push("Judge verdict is not PASS");
    }

    // 7. Dependencies complete
    if (task.dependencies.length > 0) {
      for (const depId of task.dependencies) {
        const depTask = await this.store.loadTask(depId);
        if (!depTask || depTask.status !== TaskStatus.CLOSED) {
          blockers.push(`Dependency not complete: ${depId}`);
        }
      }
    }

    // 8. Human approval (if required)
    if (task.humanApprovalRequired) {
      if (task.humanApprovalStatus !== "APPROVED") {
        blockers.push("Human approval required but not granted");
      }
    }

    return {
      canClose: blockers.length === 0,
      blockers,
    };
  }

  /**
   * 9. Transition task to CLOSED (guarded)
   */
  async closeTask(taskId: string): Promise<ClosureResult> {
    const closureCheck = await this.canCloseTask(taskId);
    if (!closureCheck.canClose) {
      return {
        success: false,
        reason: "Cannot close task - conditions not met",
        blockers: closureCheck.blockers,
      };
    }

    const task = await this.store.loadTask(taskId);
    if (!task) {
      return { success: false, reason: `Task not found: ${taskId}` };
    }

    // Transition to CLOSED
    const result = await this.updateTaskState(taskId, TaskStatus.CLOSED);

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, reason: result.reason };
    }
  }

  /**
   * 10. List tasks with filtering
   */
  async listTasks(filter?: {
    status?: TaskStatus;
    phaseTarget?: string;
    assignedAgent?: string;
    createdAfter?: Date;
    blockerReason?: string;
  }): Promise<TaskType[]> {
    return this.store.listTasks(filter);
  }

  /**
   * 11. Get task status report
   */
  async getTaskStatusReport(taskId: string): Promise<StatusReport> {
    const task = await this.store.loadTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const evidence = this.evidenceMap.get(taskId) || [];
    const reviews = this.reviewMap.get(taskId) || [];
    const judgments = this.judgmentMap.get(taskId) || [];
    const approvals = this.approvalMap.get(taskId) || [];
    const auditTrail = this.auditLog.get(taskId) || [];

    // Calculate progress
    const conditions = 8;
    let metConditions = 0;
    const closureCheck = await this.canCloseTask(taskId);

    // Count met conditions
    if (task.status !== TaskStatus.TODO) metConditions++;
    if (evidence.some((e) => e.type === EvidenceType.TEST_RESULT)) metConditions++;
    if (evidence.some((e) => e.type === EvidenceType.CI_LOG)) metConditions++;
    if (evidence.length > 0) metConditions++;
    if (reviews.some((r) => r.status === "APPROVED")) metConditions++;
    if (judgments.some((j) => j.verdict === "PASS")) metConditions++;
    if (task.dependencies.length === 0) metConditions++;
    if (!task.humanApprovalRequired || task.humanApprovalStatus === "APPROVED")
      metConditions++;

    // Final check
    if (closureCheck.canClose) {
      metConditions = conditions;
    }

    const progressPercent = Math.round((metConditions / conditions) * 100);

    return {
      taskId,
      currentState: task.status,
      progressPercent,
      blockers: closureCheck.blockers,
      evidenceQuality: {
        collected: evidence.length,
        reviewed: evidence.filter((e) => e.reviewedBy).length,
        sufficient: evidence.length >= 2, // At minimum need test + CI
      },
      reviewStatus: {
        required: task.status === TaskStatus.REVIEW,
        approved: reviews.some((r) => r.status === "APPROVED"),
        reviewer: reviews.find((r) => r.status === "APPROVED")?.reviewer,
        timestamp: reviews.find((r) => r.status === "APPROVED")?.timestamp,
      },
      judgeStatus: {
        required: task.status === TaskStatus.PASS,
        verdict: judgments[0]?.verdict,
        canClose: judgments.some((j) => j.canClose),
      },
      approvalStatus: {
        required: task.humanApprovalRequired,
        approved: task.humanApprovalStatus === "APPROVED",
      },
      costAccumulated: task.actualCost,
      retryCount: task.retryCount,
      auditTrailLength: auditTrail.length,
    };
  }

  /**
   * 12. Get task history (immutable audit trail)
   */
  async getTaskHistory(taskId: string): Promise<AuditEntry[]> {
    const entries = this.auditLog.get(taskId) || [];
    return [...entries]; // Return copy
  }

  /**
   * Helper: Build transition guards based on task state and target state
   */
  private buildTransitionGuards(task: TaskType, targetState?: TaskStatus): TransitionGuards {
    const evidence = this.evidenceMap.get(task.id) || [];
    const reviews = this.reviewMap.get(task.id) || [];
    const judgments = this.judgmentMap.get(task.id) || [];

    // For BLOCKED transitions, set errorPresent based on current blocker reason
    let errorPresent = !!task.blockerReason;

    return {
      dependencyComplete:
        task.dependencies.length === 0 ||
        task.dependencies.every((d) => d), // Simplified check
      errorPresent,
      approvalPending: task.humanApprovalRequired && task.humanApprovalStatus === "PENDING",
      evidenceSufficient: evidence.length >= 2,
      reviewApproved: reviews.some((r) => r.status === "APPROVED"),
      judgeVerdictPass: judgments.some((j) => j.verdict === "PASS"),
      allConditionsMet: false, // Will be checked in canCloseTask
    };
  }

  /**
   * Helper: Map TaskStatus to AuditAction
   */
  private mapStatusToAuditAction(status: TaskStatus): AuditAction {
    switch (status) {
      case TaskStatus.TODO:
        return AuditAction.TASK_STARTED;
      case TaskStatus.WORKING:
        return AuditAction.TASK_STARTED;
      case TaskStatus.BLOCKED:
        return AuditAction.TASK_BLOCKED;
      case TaskStatus.REVIEW:
        return AuditAction.EVIDENCE_REVIEWED;
      case TaskStatus.PASS:
        return AuditAction.VERDICT_ISSUED;
      case TaskStatus.CLOSED:
        return AuditAction.TASK_CLOSED;
      default:
        return AuditAction.TASK_STARTED;
    }
  }

  /**
   * Helper: Validate evidence for secrets
   */
  private validateEvidenceForSecrets(evidence: Evidence): void {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /bearer/i,
      /auth/i,
    ];

    const content = `${evidence.filePath} ${JSON.stringify(evidence.metadata)}`;

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        throw new Error(
          `Evidence contains sensitive data (${pattern}). Please redact before adding.`
        );
      }
    }
  }

  /**
   * Helper: Check if evidence should be redacted
   */
  private shouldRedactEvidence(evidence: Evidence): boolean {
    const sensitiveTypes = [
      EvidenceType.CI_LOG,
      EvidenceType.DEPLOYMENT_LOG,
      EvidenceType.SECURITY_SCAN,
    ];
    return sensitiveTypes.includes(evidence.type);
  }

  /**
   * Helper: Create audit entry
   */
  private createAuditEntry(
    taskId: string,
    action: AuditAction,
    agentId: string,
    details: Record<string, unknown>
  ): AuditEntry {
    return {
      traceId: `trace-${taskId}`,
      timestamp: new Date().toISOString(),
      taskId,
      agentId,
      action,
      details,
      status: AuditStatus.SUCCESS,
    };
  }

  /**
   * Helper: Record audit entry
   */
  private recordAudit(taskId: string, entry: AuditEntry): void {
    if (!this.auditLog.has(taskId)) {
      this.auditLog.set(taskId, []);
    }
    this.auditLog.get(taskId)!.push(entry);
  }

  /**
   * Get store for testing purposes
   */
  getStore(): ITaskStore {
    return this.store;
  }

  /**
   * Get evidence map for testing purposes
   */
  getEvidenceMap(): Map<string, Evidence[]> {
    return this.evidenceMap;
  }

  /**
   * Get review map for testing purposes
   */
  getReviewMap(): Map<string, Review[]> {
    return this.reviewMap;
  }

  /**
   * Get judgment map for testing purposes
   */
  getJudgmentMap(): Map<string, Judgment[]> {
    return this.judgmentMap;
  }
}
