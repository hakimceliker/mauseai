/**
 * Handoff Validator - Business logic validation for handoff operations
 *
 * Ajan arası görev devri için iş mantığı doğrulaması.
 * Agent bağımsızlığı, görev durumu ve kanıt zinciri kontrolü.
 */

import * as Domain from '@/src/types/domain';

export interface ValidationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation rules for handoff operations
 */
export class HandoffValidator {
  /**
   * Validate that source and target agents are different
   * Required for judge/review handoffs
   */
  static validateAgentIndependence(
    sourceAgent: Domain.Agent,
    targetAgent: Domain.Agent,
    isReviewHandoff: boolean = false
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic existence check
    if (!sourceAgent) {
      errors.push({
        code: 'INVALID_SOURCE_AGENT',
        message: 'Source agent does not exist',
      });
    }

    if (!targetAgent) {
      errors.push({
        code: 'INVALID_TARGET_AGENT',
        message: 'Target agent does not exist',
      });
    }

    // If not a review handoff, agents can be the same (re-routing)
    if (isReviewHandoff && sourceAgent && targetAgent) {
      if (sourceAgent.id === targetAgent.id) {
        errors.push({
          code: 'AGENT_INDEPENDENCE_VIOLATION',
          message:
            'Judge/review handoff requires different source and target agents',
          details: {
            sourceAgent: sourceAgent.id,
            targetAgent: targetAgent.id,
          },
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that task can be handed off in its current state
   */
  static validateTaskState(task: Domain.Task): ValidationResult {
    const errors: ValidationError[] = [];

    if (!task) {
      errors.push({
        code: 'INVALID_TASK',
        message: 'Task does not exist',
      });
      return { valid: false, errors };
    }

    // Task must not be in final states (blocked states for handoff)
    const finalStates = [
      Domain.TaskStatus.COMPLETED,
      Domain.TaskStatus.FAILED,
      Domain.TaskStatus.CANCELLED,
    ];

    if (finalStates.includes(task.status)) {
      errors.push({
        code: 'TASK_FINAL_STATE',
        message: `Cannot handoff task in ${task.status} state`,
        details: {
          taskId: task.id,
          currentStatus: task.status,
        },
      });
      return { valid: false, errors };
    }

    // Task must have been started or be in running/waiting state
    const validStates = [
      Domain.TaskStatus.RUNNING,
      Domain.TaskStatus.WAITING_APPROVAL,
      Domain.TaskStatus.PAUSED,
      Domain.TaskStatus.PLANNING,
      Domain.TaskStatus.PENDING, // Allow handoff from pending state
    ];

    if (!validStates.includes(task.status)) {
      errors.push({
        code: 'TASK_INVALID_STATE',
        message:
          `Task in ${task.status} state is not eligible for handoff. ` +
          `Valid states: ${validStates.join(', ')}`,
        details: {
          taskId: task.id,
          currentStatus: task.status,
          validStates,
        },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that the context contains necessary information
   */
  static validateContext(context: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!context || typeof context !== 'object') {
      errors.push({
        code: 'INVALID_CONTEXT',
        message: 'Context must be an object',
      });
      return { valid: false, errors };
    }

    // Context should not be empty
    if (Object.keys(context).length === 0) {
      errors.push({
        code: 'EMPTY_CONTEXT',
        message: 'Handoff context should contain execution state',
        details: {
          contextKeys: Object.keys(context),
        },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate evidence chain for audit trail
   */
  static validateEvidenceChain(
    evidenceRef?: string,
    previousEvidence?: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Evidence reference is optional but if provided must be valid
    if (evidenceRef) {
      // Evidence reference should be valid format (not too short, not too long)
      if (evidenceRef.length < 4 || evidenceRef.length > 255) {
        errors.push({
          code: 'INVALID_EVIDENCE_REF_LENGTH',
          message: 'Evidence reference length must be between 4 and 255',
          details: {
            length: evidenceRef.length,
          },
        });
      }

      // Should follow some format (alphanumeric with hyphens)
      if (!/^[a-zA-Z0-9\-_]+$/.test(evidenceRef)) {
        errors.push({
          code: 'INVALID_EVIDENCE_REF_FORMAT',
          message:
            'Evidence reference must contain only alphanumeric characters, hyphens, and underscores',
          details: {
            evidenceRef,
          },
        });
      }

      // Check for evidence chain integrity
      if (previousEvidence && previousEvidence.length > 0) {
        // Evidence chain should be ordered (basic check)
        if (previousEvidence.includes(evidenceRef)) {
          errors.push({
            code: 'DUPLICATE_EVIDENCE_REF',
            message:
              'Evidence reference already exists in chain',
            details: {
              evidenceRef,
            },
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that target agent has required capabilities
   */
  static validateTargetCapabilities(
    targetAgent: Domain.Agent,
    requiredCapabilities: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!targetAgent) {
      errors.push({
        code: 'INVALID_TARGET_AGENT',
        message: 'Target agent does not exist',
      });
      return { valid: false, errors };
    }

    if (!targetAgent.is_active) {
      errors.push({
        code: 'TARGET_AGENT_INACTIVE',
        message: 'Target agent is not active',
        details: {
          agentId: targetAgent.id,
        },
      });
    }

    // Check if target agent has required capabilities
    const missingCapabilities = requiredCapabilities.filter(
      (cap) => !targetAgent.capabilities.includes(cap)
    );

    if (missingCapabilities.length > 0) {
      errors.push({
        code: 'INSUFFICIENT_CAPABILITIES',
        message:
          'Target agent lacks required capabilities for task execution',
        details: {
          agentId: targetAgent.id,
          missingCapabilities,
          availableCapabilities: targetAgent.capabilities,
        },
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Comprehensive validation of handoff operation
   */
  static validateHandoffOperation(params: {
    sourceAgent: Domain.Agent;
    targetAgent: Domain.Agent;
    task: Domain.Task;
    context: Record<string, unknown>;
    isReviewHandoff?: boolean;
    requiredCapabilities?: string[];
    evidenceRef?: string;
    previousEvidence?: string[];
  }): ValidationResult {
    const allErrors: ValidationError[] = [];

    // Agent independence
    const agentValidation = this.validateAgentIndependence(
      params.sourceAgent,
      params.targetAgent,
      params.isReviewHandoff
    );
    allErrors.push(...agentValidation.errors);

    // Task state
    const taskValidation = this.validateTaskState(params.task);
    allErrors.push(...taskValidation.errors);

    // Context
    const contextValidation = this.validateContext(params.context);
    allErrors.push(...contextValidation.errors);

    // Evidence chain
    const evidenceValidation = this.validateEvidenceChain(
      params.evidenceRef,
      params.previousEvidence
    );
    allErrors.push(...evidenceValidation.errors);

    // Target agent must be active
    if (params.targetAgent && !params.targetAgent.is_active) {
      allErrors.push({
        code: 'TARGET_AGENT_INACTIVE',
        message: 'Target agent is not active',
        details: {
          agentId: params.targetAgent.id,
        },
      });
    }

    // Target capabilities
    if (params.requiredCapabilities && params.requiredCapabilities.length > 0) {
      const capabilityValidation = this.validateTargetCapabilities(
        params.targetAgent,
        params.requiredCapabilities
      );
      allErrors.push(...capabilityValidation.errors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Check if handoff can be retried
   */
  static canRetryHandoff(error?: string): boolean {
    if (!error) return true;

    // Transient errors that can be retried
    const retryableErrors = [
      'TIMEOUT',
      'TEMPORARY_UNAVAILABLE',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
    ];

    return retryableErrors.some((retryable) =>
      error.toUpperCase().includes(retryable)
    );
  }

  /**
   * Validate handoff result
   */
  static validateHandoffResult(
    result: Domain.HandoffResult | undefined,
    error?: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!result) {
      errors.push({
        code: 'MISSING_RESULT',
        message: 'Handoff result must be specified',
      });
      return { valid: false, errors };
    }

    const validResults = [
      Domain.HandoffResult.SUCCESS,
      Domain.HandoffResult.FAILURE,
      Domain.HandoffResult.TIMEOUT,
      Domain.HandoffResult.CANCELLED,
    ];

    if (!validResults.includes(result)) {
      errors.push({
        code: 'INVALID_RESULT',
        message: `Invalid handoff result: ${result}`,
        details: {
          result,
          validResults,
        },
      });
    }

    // Failure result requires error message
    if (
      result === Domain.HandoffResult.FAILURE &&
      (!error || error.trim().length === 0)
    ) {
      errors.push({
        code: 'MISSING_ERROR_MESSAGE',
        message: 'Failure result requires error message',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
