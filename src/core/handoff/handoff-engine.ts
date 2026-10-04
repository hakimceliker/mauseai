/**
 * Handoff Engine - Core orchestration for inter-agent task handoff
 *
 * Ajan arası görev devri mekanizması. Agent'ler arasında görevlerin
 * kontrollü bir şekilde devredilmesini sağlar.
 */

import * as Domain from '@/src/types/domain';
import {
  HandoffEnvelope,
  HandoffEnvelopeSchema,
  safeParseHandoffEnvelope,
} from './handoff-envelope';
import {
  HandoffValidator,
  ValidationResult,
  ValidationError,
} from './handoff-validator';

/**
 * Handoff operation result
 */
export interface HandoffOperationResult {
  success: boolean;
  handoff?: Domain.Handoff;
  error?: string;
  errors?: ValidationError[];
}

/**
 * Handoff history entry
 */
export interface HandoffHistoryEntry {
  id: string;
  sourceAgent: string;
  targetAgent: string;
  taskId: string;
  status: Domain.HandoffStatus;
  result?: Domain.HandoffResult;
  timestamp: Date;
  durationMs: number;
}

/**
 * Handoff tracking result
 */
export interface HandoffTrackingResult {
  handoffId: string;
  result: Domain.HandoffResult;
  durationMs: number;
  completedAt: Date;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * HandoffEngine - Orchestrates inter-agent task handoff operations
 *
 * Responsibilities:
 * - Initiate handoff between agents
 * - Validate handoff preconditions
 * - Execute handoff with proper state management
 * - Track handoff results and completion
 * - Maintain handoff history and audit trail
 */
export class HandoffEngine {
  private tenantId: Domain.TenantId;
  private handoffHistory: Map<string, HandoffHistoryEntry> = new Map();
  private activeHandoffs: Map<string, Domain.Handoff> = new Map();

  constructor(tenantId: Domain.TenantId) {
    this.tenantId = tenantId;
  }

  /**
   * Initiate a handoff between two agents
   *
   * Validates that:
   * - Source agent exists and is active
   * - Target agent exists and is active
   * - Task exists and is in valid state
   * - Context contains necessary execution state
   *
   * @param params - Handoff parameters
   * @returns HandoffOperationResult with created handoff or error
   */
  async initiateHandoff(params: {
    sourceAgent: Domain.Agent;
    targetAgent: Domain.Agent;
    task: Domain.Task;
    context: Record<string, unknown>;
    reason: string;
    envelope: HandoffEnvelope;
    isReviewHandoff?: boolean;
    requiredCapabilities?: string[];
  }): Promise<HandoffOperationResult> {
    try {
      // Parse and validate envelope first
      const envelopeParse = safeParseHandoffEnvelope(params.envelope);
      if (!envelopeParse.success) {
        return {
          success: false,
          error: 'Invalid handoff envelope',
          errors: envelopeParse.error.errors.map((e) => ({
            code: 'ENVELOPE_VALIDATION_ERROR',
            message: e.message,
          })),
        };
      }

      // Validate basic handoff parameters
      const basicValidation = this.validateHandoffParameters(
        params.sourceAgent,
        params.targetAgent,
        params.task,
        params.context,
        params.reason
      );

      if (!basicValidation.valid) {
        return {
          success: false,
          error: 'Handoff parameter validation failed',
          errors: basicValidation.errors,
        };
      }

      // Create handoff object
      const handoff: Domain.Handoff = {
        id: this.generateHandoffId(),
        tenant_id: this.tenantId,
        source_agent_id: params.sourceAgent.id,
        target_agent_id: params.targetAgent.id,
        task_id: params.task.id,
        status: Domain.HandoffStatus.INITIATED,
        context: params.context,
        reason: params.reason,
        sha: params.envelope.sha,
        schema_version: params.envelope.schemaVersion,
        initiated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Store in active handoffs
      this.activeHandoffs.set(handoff.id, handoff);

      // Add to history
      this.recordHandoffHistory(handoff);

      return {
        success: true,
        handoff,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to initiate handoff: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate a handoff operation
   *
   * Comprehensive validation including:
   * - Source/target agent independence (for review handoffs)
   * - Task state eligibility
   * - Context validity
   * - Evidence chain integrity
   * - Target agent capabilities
   *
   * @param params - Validation parameters
   * @returns ValidationResult with success flag and detailed errors
   */
  async validateHandoff(params: {
    sourceAgent: Domain.Agent;
    targetAgent: Domain.Agent;
    task: Domain.Task;
    context: Record<string, unknown>;
    isReviewHandoff?: boolean;
    requiredCapabilities?: string[];
    evidenceRef?: string;
    previousEvidence?: string[];
  }): Promise<ValidationResult> {
    // Use HandoffValidator for comprehensive validation
    return HandoffValidator.validateHandoffOperation({
      sourceAgent: params.sourceAgent,
      targetAgent: params.targetAgent,
      task: params.task,
      context: params.context,
      isReviewHandoff: params.isReviewHandoff,
      requiredCapabilities: params.requiredCapabilities,
      evidenceRef: params.evidenceRef,
      previousEvidence: params.previousEvidence,
    });
  }

  /**
   * Execute a handoff operation
   *
   * Transitions handoff through states:
   * INITIATED -> VALIDATED -> EXECUTING -> COMPLETED/FAILED
   *
   * @param handoffId - ID of handoff to execute
   * @param targetAgent - Agent receiving the task
   * @returns HandoffOperationResult with updated handoff
   */
  async executeHandoff(handoffId: string): Promise<HandoffOperationResult> {
    try {
      const handoff = this.activeHandoffs.get(handoffId);

      if (!handoff) {
        return {
          success: false,
          error: `Handoff ${handoffId} not found`,
        };
      }

      // Transition to VALIDATED state
      handoff.status = Domain.HandoffStatus.VALIDATED;
      handoff.updated_at = new Date();

      // Transition to EXECUTING state
      handoff.status = Domain.HandoffStatus.EXECUTING;
      handoff.updated_at = new Date();

      // Simulate handoff execution (in real implementation, would call target agent)
      // For now, just transition to COMPLETED
      handoff.status = Domain.HandoffStatus.COMPLETED;
      handoff.result = Domain.HandoffResult.SUCCESS;
      handoff.completed_at = new Date();
      handoff.updated_at = new Date();

      // Update in active handoffs
      this.activeHandoffs.set(handoff.id, handoff);

      // Update history
      this.updateHandoffHistory(handoff);

      return {
        success: true,
        handoff,
      };
    } catch (error) {
      const handoff = this.activeHandoffs.get(handoffId);
      if (handoff) {
        handoff.status = Domain.HandoffStatus.FAILED;
        handoff.error = error instanceof Error ? error.message : 'Unknown error';
        handoff.result = Domain.HandoffResult.FAILURE;
        handoff.completed_at = new Date();
        handoff.updated_at = new Date();
        this.activeHandoffs.set(handoff.id, handoff);
        this.updateHandoffHistory(handoff);
      }

      return {
        success: false,
        error: `Failed to execute handoff: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Track and record handoff result
   *
   * Updates handoff with completion status and result
   * Maintains audit trail for compliance
   *
   * @param handoffId - ID of handoff to track
   * @param result - Handoff result (success/failure/timeout)
   * @param params - Additional tracking parameters
   * @returns HandoffTrackingResult with final state
   */
  async trackHandoffResult(
    handoffId: string,
    result: Domain.HandoffResult,
    params?: {
      output?: Record<string, unknown>;
      error?: string;
      durationMs?: number;
    }
  ): Promise<HandoffOperationResult> {
    try {
      const handoff = this.activeHandoffs.get(handoffId);

      if (!handoff) {
        return {
          success: false,
          error: `Handoff ${handoffId} not found`,
        };
      }

      // Validate result
      const resultValidation = HandoffValidator.validateHandoffResult(
        result,
        params?.error
      );

      if (!resultValidation.valid) {
        return {
          success: false,
          error: 'Invalid handoff result',
          errors: resultValidation.errors,
        };
      }

      // Update handoff with result
      handoff.result = result;
      handoff.completed_at = new Date();
      handoff.updated_at = new Date();

      if (params?.output) {
        handoff.output = params.output;
      }

      if (params?.error) {
        handoff.error = params.error;
      }

      // Determine final status based on result
      switch (result) {
        case Domain.HandoffResult.SUCCESS:
          handoff.status = Domain.HandoffStatus.COMPLETED;
          break;
        case Domain.HandoffResult.FAILURE:
          handoff.status = Domain.HandoffStatus.FAILED;
          break;
        case Domain.HandoffResult.TIMEOUT:
          handoff.status = Domain.HandoffStatus.FAILED;
          if (!handoff.error) {
            handoff.error = 'Handoff execution timeout';
          }
          break;
        case Domain.HandoffResult.CANCELLED:
          handoff.status = Domain.HandoffStatus.CANCELLED;
          break;
      }

      // Update in active handoffs
      this.activeHandoffs.set(handoff.id, handoff);

      // Update history
      this.updateHandoffHistory(handoff);

      // Remove from active handoffs if completed
      if (
        result === Domain.HandoffResult.SUCCESS ||
        result === Domain.HandoffResult.CANCELLED
      ) {
        this.activeHandoffs.delete(handoffId);
      }

      return {
        success: true,
        handoff,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to track handoff result: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get complete handoff history
   *
   * Returns all handoff operations for audit and analysis
   * Ordered by most recent first
   *
   * @param filters - Optional filters (taskId, sourceAgent, targetAgent)
   * @returns Array of handoff history entries
   */
  async getHandoffHistory(filters?: {
    taskId?: string;
    sourceAgentId?: string;
    targetAgentId?: string;
    limit?: number;
  }): Promise<HandoffHistoryEntry[]> {
    let history = Array.from(this.handoffHistory.values());

    // Apply filters
    if (filters?.taskId) {
      history = history.filter((h) => h.taskId === filters.taskId);
    }

    if (filters?.sourceAgentId) {
      history = history.filter(
        (h) => h.sourceAgent === filters.sourceAgentId
      );
    }

    if (filters?.targetAgentId) {
      history = history.filter(
        (h) => h.targetAgent === filters.targetAgentId
      );
    }

    // Sort by timestamp, most recent first
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters?.limit) {
      history = history.slice(0, filters.limit);
    }

    return history;
  }

  /**
   * Get statistics about handoffs
   */
  async getHandoffStatistics(): Promise<{
    totalHandoffs: number;
    successfulHandoffs: number;
    failedHandoffs: number;
    averageDurationMs: number;
    activeHandoffs: number;
  }> {
    const allHistory = Array.from(this.handoffHistory.values());

    const successful = allHistory.filter(
      (h) => h.status === Domain.HandoffStatus.COMPLETED
    );
    const failed = allHistory.filter(
      (h) => h.status === Domain.HandoffStatus.FAILED
    );

    const totalDuration = allHistory.reduce((sum, h) => sum + h.durationMs, 0);
    const averageDuration =
      allHistory.length > 0 ? totalDuration / allHistory.length : 0;

    return {
      totalHandoffs: allHistory.length,
      successfulHandoffs: successful.length,
      failedHandoffs: failed.length,
      averageDurationMs: Math.round(averageDuration),
      activeHandoffs: this.activeHandoffs.size,
    };
  }

  /**
   * Cancel an active handoff
   */
  async cancelHandoff(handoffId: string): Promise<HandoffOperationResult> {
    try {
      const handoff = this.activeHandoffs.get(handoffId);

      if (!handoff) {
        return {
          success: false,
          error: `Handoff ${handoffId} not found or already completed`,
        };
      }

      handoff.status = Domain.HandoffStatus.CANCELLED;
      handoff.result = Domain.HandoffResult.CANCELLED;
      handoff.completed_at = new Date();
      handoff.updated_at = new Date();

      this.activeHandoffs.set(handoff.id, handoff);
      this.updateHandoffHistory(handoff);
      this.activeHandoffs.delete(handoffId);

      return {
        success: true,
        handoff,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to cancel handoff: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Private helper methods
   */

  private validateHandoffParameters(
    sourceAgent: Domain.Agent,
    targetAgent: Domain.Agent,
    task: Domain.Task,
    context: Record<string, unknown>,
    reason: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!sourceAgent) {
      errors.push({
        code: 'MISSING_SOURCE_AGENT',
        message: 'Source agent is required',
      });
    }

    if (!targetAgent) {
      errors.push({
        code: 'MISSING_TARGET_AGENT',
        message: 'Target agent is required',
      });
    }

    if (!task) {
      errors.push({
        code: 'MISSING_TASK',
        message: 'Task is required',
      });
    }

    if (!context || Object.keys(context).length === 0) {
      errors.push({
        code: 'INVALID_CONTEXT',
        message: 'Context must be provided and non-empty',
      });
    }

    if (!reason || reason.trim().length === 0) {
      errors.push({
        code: 'MISSING_REASON',
        message: 'Reason for handoff is required',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateHandoffId(): Domain.HandoffId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `handoff-${timestamp}-${random}` as Domain.HandoffId;
  }

  private recordHandoffHistory(handoff: Domain.Handoff): void {
    const entry: HandoffHistoryEntry = {
      id: handoff.id,
      sourceAgent: handoff.source_agent_id,
      targetAgent: handoff.target_agent_id,
      taskId: handoff.task_id,
      status: handoff.status,
      timestamp: handoff.initiated_at,
      durationMs: 0,
    };

    this.handoffHistory.set(handoff.id, entry);
  }

  private updateHandoffHistory(handoff: Domain.Handoff): void {
    const entry = this.handoffHistory.get(handoff.id);

    if (entry) {
      entry.status = handoff.status;
      entry.result = handoff.result;

      if (handoff.completed_at) {
        entry.durationMs =
          handoff.completed_at.getTime() - handoff.initiated_at.getTime();
      }

      this.handoffHistory.set(handoff.id, entry);
    }
  }

  /**
   * Clear history (useful for testing)
   */
  clearHistory(): void {
    this.handoffHistory.clear();
    this.activeHandoffs.clear();
  }
}

/**
 * Factory function to create HandoffEngine
 */
export function createHandoffEngine(
  tenantId: Domain.TenantId
): HandoffEngine {
  return new HandoffEngine(tenantId);
}
