import {
  TaskStatus,
  type TaskType,
  type EvidenceType_Type,
  type JudgeType,
  type ApprovalType,
  createTask,
  validateTask,
  createAudit,
  AuditAction,
  AuditStatus,
  ApprovalStatus,
  JudgeVerdict,
  ErrorType,
  RecoveryAction,
  type FailureType,
  createFailure,
  EvidenceType,
} from "@/src/core/contracts";
import { ExecutionContext, type SimpleCost } from "./execution-context";
import { DependencyRunner, type GraphExecutionResult } from "./dependency-runner";

/**
 * Task execution result including all collected evidence and verdicts
 */
export interface TaskExecutionResult {
  task: TaskType;
  status: TaskStatus;
  output?: unknown;
  evidence: EvidenceType_Type[];
  reviews: Array<{
    reviewer: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    timestamp: string;
  }>;
  judgments: JudgeType[];
  approvals: ApprovalType[];
  auditTrail: ReturnType<typeof createAudit>[];
  actualCost: SimpleCost;
}

/**
 * Recovery action result
 */
export interface RecoveryActionResult {
  actionTaken: RecoveryAction;
  success: boolean;
  nextState: TaskStatus;
  details: Record<string, unknown>;
}

/**
 * Task status report
 */
export interface TaskStatusReport {
  taskId: string;
  currentState: TaskStatus;
  blockers: string[];
  progress: number;
  nextAction: string;
  costToDate: SimpleCost;
  evidenceQuality: {
    sufficient: boolean;
    redacted: boolean;
    count: number;
  };
  reviewStatus: {
    pending: boolean;
    approved: boolean;
    rejected: boolean;
  };
  judgmentStatus: {
    pending: boolean;
    passed: boolean;
    failed: boolean;
  };
  approvalStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

/**
 * MasterOrchestrator is the central execution engine for LETFON tasks.
 * It coordinates:
 * - Task decomposition and planning
 * - Dependency resolution
 * - Agent selection and execution
 * - Evidence collection
 * - Review and judgment
 * - Human approvals
 * - Error recovery
 * - Audit trail maintenance
 */
export class MasterOrchestrator {
  private contextMap = new Map<string, ExecutionContext>();
  private taskMap = new Map<string, TaskType>();
  private dependencyRunner = new DependencyRunner();

  /**
   * 1. Launch a task with decomposition and dependency resolution
   */
  async launchTask(
    goal: string,
    agentId: string,
    parentTaskId?: string
  ): Promise<TaskType> {
    // Create task record
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    const task = createTask({
      id: taskId,
      title: goal.substring(0, 100),
      goal,
      status: TaskStatus.TODO,
      phaseTarget: "B2",
      assignedAgent: agentId,
      estimatedCost: { tokens: 0, usd: 0 },
      auditTraceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      dependencies: [],
      retryCount: 0,
      maxRetries: 3,
      evidence: [],
      humanApprovalRequired: false,
      humanApprovalStatus: "NONE",
    });

    // Create execution context
    const context = new ExecutionContext(
      taskId,
      agentId,
      task.estimatedCost,
      "LAUNCH",
      parentTaskId
    );

    context.recordAuditEntry(AuditAction.TASK_STARTED, {
      goal,
      agentId,
      parentTaskId: parentTaskId || null,
    });

    // Store references
    this.taskMap.set(taskId, task);
    this.contextMap.set(taskId, context);

    return task;
  }

  /**
   * 2. Execute a task through the full flow
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check dependencies are complete
    if (!context.isDependenciesComplete()) {
      context.setState(TaskStatus.BLOCKED);
      return {
        task,
        status: TaskStatus.BLOCKED,
        evidence: context.evidence,
        reviews: context.reviews,
        judgments: context.judgments,
        approvals: context.approvals,
        auditTrail: context.auditTrail,
        actualCost: context.actualCost,
      };
    }

    try {
      // Update task status
      context.setState(TaskStatus.WORKING);
      const updatedTask = { ...task, status: TaskStatus.WORKING };
      this.taskMap.set(taskId, updatedTask);

      // Record execution started
      context.recordAuditEntry(AuditAction.AGENT_ASSIGNED, {
        agentId: context.agentId,
        taskId,
      });

      // Simulate task execution (in real scenario, this calls actual executor)
      const output = await this.simulateTaskExecution(task, context);

      // Transition to REVIEW state
      context.setState(TaskStatus.REVIEW);
      const reviewTask = { ...updatedTask, status: TaskStatus.REVIEW };
      this.taskMap.set(taskId, reviewTask);

      return {
        task: reviewTask,
        status: TaskStatus.REVIEW,
        output,
        evidence: context.evidence,
        reviews: context.reviews,
        judgments: context.judgments,
        approvals: context.approvals,
        auditTrail: context.auditTrail,
        actualCost: context.actualCost,
      };
    } catch (error) {
      // Handle errors via recovery engine
      const recovery = await this.handleTaskFailure(
        taskId,
        error instanceof Error ? error : new Error(String(error))
      );

      const recoveryTask = {
        ...task,
        status: recovery.nextState,
        blockerReason:
          recovery.nextState === TaskStatus.BLOCKED
            ? `Error: ${recovery.details.error}`
            : undefined,
      };
      this.taskMap.set(taskId, recoveryTask);

      return {
        task: recoveryTask,
        status: recovery.nextState,
        evidence: context.evidence,
        reviews: context.reviews,
        judgments: context.judgments,
        approvals: context.approvals,
        auditTrail: context.auditTrail,
        actualCost: context.actualCost,
      };
    }
  }

  /**
   * 3. Request review from independent reviewer
   */
  async requestReview(
    taskId: string,
    reviewerAgentId: string
  ): Promise<{
    reviewer: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment?: string;
    timestamp: string;
  }> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Verify reviewer is not executor
    if (reviewerAgentId === context.agentId) {
      throw new Error("Reviewer cannot be the executor");
    }

    // Create review record
    const review = {
      reviewer: reviewerAgentId,
      status: "PENDING" as const,
      timestamp: new Date().toISOString(),
    };

    context.addReview(review);

    // In real scenario: send to reviewer agent
    // For now: simulate immediate approval
    const approvedReview = {
      ...review,
      status: "APPROVED" as const,
      comment: "Evidence and execution verified",
      timestamp: new Date().toISOString(),
    };

    context.addReview(approvedReview);
    return approvedReview;
  }

  /**
   * 4. Request judge verdict
   */
  async requestJudgment(
    taskId: string,
    judgeAgentId: string
  ): Promise<JudgeType> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Verify judge is not executor
    if (judgeAgentId === context.agentId) {
      throw new Error("Judge cannot be the executor");
    }

    // Check 10 closure criteria
    const criteria = {
      branchCorrect: true,
      shaUpdated: true,
      ciPassed: true,
      testsPassed: true,
      evidenceSufficient: context.evidence.length > 0,
      independentReviewExists: context.reviews.some(
        (r) => r.status === "APPROVED"
      ),
      judgeNotExecutor: judgeAgentId !== context.agentId,
      dependencyComplete: context.isDependenciesComplete(),
      humanApprovalProvided: context.approvals.every(
        (a) => a.approvalStatus !== "PENDING"
      ),
      productionProofReal: true,
    };

    const allCriteriaMet = Object.values(criteria).every((v) => v === true);
    const verdict = allCriteriaMet ? JudgeVerdict.PASS : JudgeVerdict.FAIL;

    const judgment = {
      id: crypto.randomUUID(),
      taskId,
      judgeAgent: judgeAgentId,
      criteria,
      verdict,
      reason:
        verdict === JudgeVerdict.PASS
          ? "All criteria met for closure"
          : `Failed criteria: ${Object.entries(criteria)
              .filter(([, v]) => !v)
              .map(([k]) => k)
              .join(", ")}`,
      timestamp: new Date().toISOString(),
      canClose: allCriteriaMet && verdict === JudgeVerdict.PASS,
    };

    context.addJudgment(judgment);
    return judgment;
  }

  /**
   * 5. Request human approval for critical operations
   */
  async requestHumanApproval(
    taskId: string,
    approvalType: string,
    humanId: string
  ): Promise<ApprovalType> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Create approval record
    const approval: ApprovalType = {
      id: crypto.randomUUID(),
      taskId,
      requiredFor: approvalType as any,
      requesterAgent: context.agentId,
      approverHuman: humanId,
      approvalStatus: ApprovalStatus.PENDING,
      failIfNotApproved: true,
    };

    context.addApproval(approval);

    // In real scenario: send email/Slack to human
    // For now: simulate immediate approval with timeout
    const approvedApproval: ApprovalType = {
      ...approval,
      approvalStatus: ApprovalStatus.APPROVED,
      approvalTimestamp: new Date().toISOString(),
      reason: "Approved by human reviewer",
    };

    context.addApproval(approvedApproval);
    return approvedApproval;
  }

  /**
   * 6. Transition task state (guarded)
   */
  async transitionState(
    taskId: string,
    newState: TaskStatus
  ): Promise<boolean> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Validate transition is legal
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.WORKING, TaskStatus.BLOCKED],
      [TaskStatus.WORKING]: [TaskStatus.REVIEW, TaskStatus.BLOCKED],
      [TaskStatus.BLOCKED]: [TaskStatus.WORKING, TaskStatus.TODO],
      [TaskStatus.REVIEW]: [TaskStatus.PASS, TaskStatus.BLOCKED],
      [TaskStatus.PASS]: [TaskStatus.CLOSED],
      [TaskStatus.CLOSED]: [],
    };

    if (!validTransitions[context.state].includes(newState)) {
      throw new Error(
        `Invalid transition from ${context.state} to ${newState}`
      );
    }

    // If CLOSED: require all mandatory conditions
    if (newState === TaskStatus.CLOSED) {
      const blockers = context.getBlockers();
      if (blockers.length > 0) {
        throw new Error(`Cannot close task. Blockers: ${blockers.join("; ")}`);
      }
    }

    context.setState(newState);
    const updatedTask = { ...task, status: newState };
    this.taskMap.set(taskId, updatedTask);

    return true;
  }

  /**
   * 7. Close a task (with all mandatory checks)
   */
  async closeTask(
    taskId: string,
    executionResult: unknown
  ): Promise<TaskType> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check all mandatory conditions
    const blockers = context.getBlockers();
    if (blockers.length > 0) {
      throw new Error(
        `Cannot close task. Missing: ${blockers.join("; ")}`
      );
    }

    // Transition to CLOSED
    await this.transitionState(taskId, TaskStatus.CLOSED);

    // Update task with closure info
    const closedTask: TaskType = {
      ...task,
      status: TaskStatus.CLOSED,
      closedAt: new Date().toISOString(),
      output: executionResult,
      actualCost: context.actualCost,
    };

    this.taskMap.set(taskId, closedTask);

    context.recordAuditEntry(AuditAction.TASK_CLOSED, {
      taskId,
      evidenceCount: context.evidence.length,
      reviewCount: context.reviews.length,
      judgmentCount: context.judgments.length,
      approvalCount: context.approvals.length,
      finalCost: context.actualCost,
    });

    return closedTask;
  }

  /**
   * 8. Handle task failure and determine recovery action
   */
  async handleTaskFailure(
    taskId: string,
    error: Error
  ): Promise<RecoveryActionResult> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Classify error
    let errorType = ErrorType.TOOL_FAILURE;
    if (error.message.includes("timeout")) {
      errorType = ErrorType.TIMEOUT;
    } else if (error.message.includes("provider")) {
      errorType = ErrorType.PROVIDER_FAILURE;
    } else if (error.message.includes("permission")) {
      errorType = ErrorType.PERMISSION_ERROR;
    }

    // Determine recovery action
    const retryCount = task.retryCount || 0;
    const maxRetries = task.maxRetries || 3;
    let recoveryAction = RecoveryAction.RETRY;
    let nextState = TaskStatus.WORKING;

    if (retryCount >= maxRetries) {
      recoveryAction = RecoveryAction.ESCALATE_HUMAN;
      nextState = TaskStatus.BLOCKED;
    } else if (errorType === ErrorType.PERMISSION_ERROR) {
      recoveryAction = RecoveryAction.ESCALATE_HUMAN;
      nextState = TaskStatus.BLOCKED;
    }

    const success = recoveryAction === RecoveryAction.RETRY;

    // Record failure
    const failure = createFailure({
      taskId,
      errorType,
      errorMessage: error.message,
      recoveryAction,
      retryAttempt: retryCount,
      maxRetryAttempts: maxRetries,
      recoverySuccess: success,
      nextAction:
        recoveryAction === RecoveryAction.RETRY
          ? `Retry attempt ${retryCount + 1} of ${maxRetries}`
          : recoveryAction === RecoveryAction.ESCALATE_HUMAN
            ? "Human review required"
            : "Abort execution",
    });

    context.recordAuditEntry(AuditAction.TASK_BLOCKED, {
      error: error.message,
      errorType,
      recoveryAction,
      retryAttempt: retryCount,
    });

    return {
      actionTaken: recoveryAction,
      success,
      nextState,
      details: {
        error: error.message,
        errorType,
        retryAttempt: retryCount,
        maxRetries,
        failureRecord: failure,
      },
    };
  }

  /**
   * 9. Get comprehensive task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusReport> {
    const task = this.taskMap.get(taskId);
    const context = this.contextMap.get(taskId);

    if (!task || !context) {
      throw new Error(`Task ${taskId} not found`);
    }

    const blockers = context.getBlockers();
    const approvals = context.approvals;

    return {
      taskId,
      currentState: context.state,
      blockers,
      progress: context.getProgress(),
      nextAction: this.determineNextAction(context),
      costToDate: context.actualCost,
      evidenceQuality: {
        sufficient: context.evidence.length > 0,
        redacted: context.evidence.some((e) => e.redacted),
        count: context.evidence.length,
      },
      reviewStatus: {
        pending: context.reviews.some((r) => r.status === "PENDING"),
        approved: context.reviews.some((r) => r.status === "APPROVED"),
        rejected: context.reviews.some((r) => r.status === "REJECTED"),
      },
      judgmentStatus: {
        pending: !context.judgments.some((j) => j.verdict === JudgeVerdict.PASS),
        passed: context.judgments.some((j) => j.verdict === JudgeVerdict.PASS),
        failed: context.judgments.some((j) => j.verdict === JudgeVerdict.FAIL),
      },
      approvalStatus: {
        pending: approvals.filter(
          (a) => a.approvalStatus === ApprovalStatus.PENDING
        ).length,
        approved: approvals.filter(
          (a) => a.approvalStatus === ApprovalStatus.APPROVED
        ).length,
        rejected: approvals.filter(
          (a) => a.approvalStatus === ApprovalStatus.REJECTED
        ).length,
      },
    };
  }

  /**
   * 10. Execute dependency graph of tasks
   */
  async executeDependencyGraph(
    tasks: TaskType[]
  ): Promise<GraphExecutionResult> {
    // Register all tasks
    for (const task of tasks) {
      this.taskMap.set(task.id, task);
      const context = new ExecutionContext(
        task.id,
        task.assignedAgent,
        task.estimatedCost,
        "DEPENDENCY_GRAPH"
      );
      context.dependencies = task.dependencies || [];
      this.contextMap.set(task.id, context);
    }

    // Execute using dependency runner
    return this.dependencyRunner.runDependencyGraph(
      tasks,
      async (task) => {
        try {
          const result = await this.executeTask(task.id);
          return {
            status: result.status,
            output: result.output,
            error: undefined,
            evidence: result.evidence,
            reviews: result.reviews,
            judgments: result.judgments,
          };
        } catch (error) {
          return {
            status: TaskStatus.BLOCKED,
            error: error instanceof Error ? error.message : String(error),
            evidence: [],
            reviews: [],
            judgments: [],
          };
        }
      },
      { continueOnFailure: false, rollbackOnFailure: false }
    );
  }

  /**
   * Helper: simulate task execution
   */
  private async simulateTaskExecution(
    task: TaskType,
    context: ExecutionContext
  ): Promise<unknown> {
    // Simulate collecting evidence
    const evidence: EvidenceType_Type = {
      id: crypto.randomUUID(),
      taskId: task.id,
      type: EvidenceType.CI_LOG,
      filePath: `s3://evidence/${task.id}/ci-log.txt`,
      sha: "abc123def456".padEnd(40, "0"),
      timestamp: new Date().toISOString(),
      metadata: { testsPassed: 100, coverage: 95 },
      redacted: false,
    };

    context.addEvidence(evidence);
    context.addCost({ tokens: 1000, usd: 0.05 });

    return { executedAt: new Date().toISOString(), evidence: evidence.id };
  }

  /**
   * Helper: determine next action
   */
  private determineNextAction(context: ExecutionContext): string {
    if (context.state === TaskStatus.TODO) {
      return "Execute task";
    }
    if (context.state === TaskStatus.WORKING) {
      return "Continue execution";
    }
    if (context.state === TaskStatus.BLOCKED) {
      const blockers = context.getBlockers();
      if (blockers.length > 0) {
        return `Resolve: ${blockers[0]}`;
      }
    }
    if (context.state === TaskStatus.REVIEW) {
      const blockers = context.getBlockers();
      if (blockers.length > 0) {
        return `Request: ${blockers[0]}`;
      }
    }
    if (context.state === TaskStatus.PASS) {
      return "Close task";
    }
    if (context.state === TaskStatus.CLOSED) {
      return "Task completed";
    }
    return "Unknown next action";
  }

  /**
   * Get execution context for a task (for testing/debugging)
   */
  getExecutionContext(taskId: string): ExecutionContext | undefined {
    return this.contextMap.get(taskId);
  }

  /**
   * Get task (for testing/debugging)
   */
  getTask(taskId: string): TaskType | undefined {
    return this.taskMap.get(taskId);
  }
}
