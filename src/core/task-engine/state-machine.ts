import { TaskStatus, TaskType } from "@/src/core/contracts";

/**
 * State Machine - Validates legal task state transitions with strict guards
 *
 * Legal transitions:
 * TODO → WORKING
 * WORKING → BLOCKED | REVIEW
 * BLOCKED → WORKING | REVIEW
 * REVIEW → PASS | BLOCKED (if rejected)
 * PASS → CLOSED
 * CLOSED → Terminal (immutable)
 */

export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
}

export interface TransitionGuards {
  dependencyComplete?: boolean;
  errorPresent?: boolean;
  approvalPending?: boolean;
  evidenceSufficient?: boolean;
  reviewApproved?: boolean;
  judgeVerdictPass?: boolean;
  allConditionsMet?: boolean;
}

/**
 * State Machine class - validates all state transitions
 */
export class StateMachine {
  /**
   * Validates if a state transition is allowed
   */
  static validateTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
    task: TaskType,
    guards: TransitionGuards = {}
  ): TransitionValidation {
    // No-op transition (staying in same state)
    if (currentStatus === newStatus) {
      return { allowed: true };
    }

    // Closed state is terminal - no transitions out
    if (currentStatus === TaskStatus.CLOSED) {
      return {
        allowed: false,
        reason: "Cannot transition from CLOSED state - it is immutable and terminal",
      };
    }

    // Validate specific transitions
    const transitionKey = `${currentStatus}→${newStatus}`;

    switch (transitionKey) {
      case `${TaskStatus.TODO}→${TaskStatus.WORKING}`:
        // TODO → WORKING requires agent assigned
        if (!task.assignedAgent) {
          return {
            allowed: false,
            reason: "Cannot transition to WORKING: no agent assigned",
          };
        }
        // Check dependencies
        if (
          task.dependencies.length > 0 &&
          guards.dependencyComplete === false
        ) {
          return {
            allowed: false,
            reason: "Cannot transition to WORKING: pending dependencies",
          };
        }
        return { allowed: true };

      case `${TaskStatus.WORKING}→${TaskStatus.BLOCKED}`:
        // WORKING → BLOCKED requires error or approval required
        if (!guards.errorPresent && !guards.approvalPending) {
          return {
            allowed: false,
            reason:
              "Cannot transition to BLOCKED: no error or approval requirement present",
          };
        }
        return { allowed: true };

      case `${TaskStatus.WORKING}→${TaskStatus.REVIEW}`:
        // WORKING → REVIEW requires task execution complete
        // No additional guards needed beyond status change
        return { allowed: true };

      case `${TaskStatus.BLOCKED}→${TaskStatus.WORKING}`:
        // BLOCKED → WORKING requires blocker resolved and agent assigned
        if (!task.assignedAgent) {
          return {
            allowed: false,
            reason:
              "Cannot transition to WORKING: no agent assigned",
          };
        }
        // Check dependencies if they exist
        if (
          task.dependencies.length > 0 &&
          guards.dependencyComplete === false
        ) {
          return {
            allowed: false,
            reason: "Cannot transition to WORKING: pending dependencies",
          };
        }
        return { allowed: true };

      case `${TaskStatus.BLOCKED}→${TaskStatus.REVIEW}`:
        // BLOCKED → REVIEW requires blocker resolved + review obtained + evidence sufficient
        if (guards.evidenceSufficient === false) {
          return {
            allowed: false,
            reason: "Cannot transition to REVIEW: evidence insufficient",
          };
        }
        return { allowed: true };

      case `${TaskStatus.REVIEW}→${TaskStatus.PASS}`:
        // REVIEW → PASS requires review approved and judge verdict PASS
        if (guards.reviewApproved !== true) {
          return {
            allowed: false,
            reason:
              "Cannot transition to PASS: review not approved or pending",
          };
        }
        if (guards.judgeVerdictPass !== true) {
          return {
            allowed: false,
            reason: "Cannot transition to PASS: judge verdict is not PASS",
          };
        }
        return { allowed: true };

      case `${TaskStatus.REVIEW}→${TaskStatus.BLOCKED}`:
        // REVIEW → BLOCKED (auto-reject on review rejection)
        // No guards needed - this is automatic on review rejection
        return { allowed: true };

      case `${TaskStatus.PASS}→${TaskStatus.CLOSED}`:
        // PASS → CLOSED requires strict enforcement of 8 mandatory conditions
        if (guards.allConditionsMet !== true) {
          return {
            allowed: false,
            reason:
              "Cannot transition to CLOSED: not all 8 mandatory conditions met",
          };
        }
        return { allowed: true };

      default:
        // All other transitions are illegal
        return {
          allowed: false,
          reason: `Illegal transition: ${transitionKey} is not allowed`,
        };
    }
  }

  /**
   * Gets all valid next states from current state
   */
  static getValidNextStates(currentStatus: TaskStatus): TaskStatus[] {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.WORKING],
      [TaskStatus.WORKING]: [TaskStatus.BLOCKED, TaskStatus.REVIEW],
      [TaskStatus.BLOCKED]: [TaskStatus.WORKING, TaskStatus.REVIEW],
      [TaskStatus.REVIEW]: [TaskStatus.PASS, TaskStatus.BLOCKED],
      [TaskStatus.PASS]: [TaskStatus.CLOSED],
      [TaskStatus.CLOSED]: [], // Terminal state
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Checks if a state transition path is valid
   */
  static isValidPath(from: TaskStatus, to: TaskStatus): boolean {
    if (from === to) return true;

    const visited = new Set<TaskStatus>();
    const queue: TaskStatus[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === to) return true;
      if (visited.has(current)) continue;

      visited.add(current);
      const nextStates = this.getValidNextStates(current);
      queue.push(...nextStates);
    }

    return false;
  }

  /**
   * Gets a description of the state
   */
  static getStateDescription(status: TaskStatus): string {
    const descriptions: Record<TaskStatus, string> = {
      [TaskStatus.TODO]: "Task created, waiting for execution to start",
      [TaskStatus.WORKING]: "Task is being executed by assigned agent",
      [TaskStatus.BLOCKED]: "Task execution blocked due to error or approval required",
      [TaskStatus.REVIEW]: "Task execution complete, awaiting code review and judgment",
      [TaskStatus.PASS]: "All reviews and judgments passed, ready to close",
      [TaskStatus.CLOSED]:
        "Task completed and closed - immutable terminal state",
    };

    return descriptions[status];
  }
}
