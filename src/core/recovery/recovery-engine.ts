/**
 * Recovery Engine - Error Classification & Recovery Routing
 * B10 Phase - Routes errors to appropriate recovery actions
 */

import { TaskId } from '@/types/domain';
import {
  ErrorClassification,
  RecoveryAction,
  ErrorContext,
  ClassificationResult,
  RecoveryPlan,
  RecoveryResult,
} from './types';

export interface RecoveryEngineConfig {
  maxRetries: number;
  maxRetryDurationMs: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  enableCheckpointRecovery: boolean;
  escalationThreshold: number;
}

const DEFAULT_CONFIG: RecoveryEngineConfig = {
  maxRetries: 3,
  maxRetryDurationMs: 300000, // 5 minutes
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
  enableCheckpointRecovery: true,
  escalationThreshold: 2,
};

/**
 * Recovery Engine - Classifies errors and routes to recovery actions
 */
export class RecoveryEngine {
  private config: RecoveryEngineConfig;
  private recoveryPlans: Map<TaskId, RecoveryPlan> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();

  constructor(config: Partial<RecoveryEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeErrorPatterns();
  }

  /**
   * Initialize common error patterns for classification
   */
  private initializeErrorPatterns(): void {
    // Timeout patterns
    this.errorPatterns.set('timeout', {
      patterns: [
        /timeout/i,
        /timed out/i,
        /exceed.*timeout/i,
        /operation.*timeout/i,
        /deadline exceeded/i,
      ],
      classification: ErrorClassification.TIMEOUT,
      severity: 'high',
    });

    // Provider failure patterns
    this.errorPatterns.set('provider_failure', {
      patterns: [
        /provider.*error/i,
        /api.*error/i,
        /service.*unavailable/i,
        /connection.*refused/i,
        /network.*error/i,
        /503|502|501/,
      ],
      classification: ErrorClassification.PROVIDER_FAILURE,
      severity: 'high',
    });

    // Tool failure patterns
    this.errorPatterns.set('tool_failure', {
      patterns: [
        /tool.*failed/i,
        /tool.*error/i,
        /command not found/i,
        /execution failed/i,
        /tool.*unavailable/i,
      ],
      classification: ErrorClassification.TOOL_FAILURE,
      severity: 'medium',
    });

    // Model failure patterns
    this.errorPatterns.set('model_failure', {
      patterns: [
        /model.*error/i,
        /inference.*failed/i,
        /model.*unavailable/i,
        /context.*length/i,
        /token.*limit/i,
      ],
      classification: ErrorClassification.MODEL_FAILURE,
      severity: 'high',
    });

    // Permission error patterns
    this.errorPatterns.set('permission_error', {
      patterns: [
        /permission denied/i,
        /access denied/i,
        /unauthorized/i,
        /forbidden/i,
        /not authorized/i,
        /403|401/,
      ],
      classification: ErrorClassification.PERMISSION_ERROR,
      severity: 'critical',
    });

    // Data corruption patterns
    this.errorPatterns.set('corrupt_data', {
      patterns: [
        /corrupt/i,
        /invalid.*data/i,
        /malformed/i,
        /parse.*error/i,
        /checksum.*failed/i,
      ],
      classification: ErrorClassification.CORRUPT_DATA,
      severity: 'critical',
    });
  }

  /**
   * Classify an error and determine recovery strategy
   */
  async classifyError(context: ErrorContext): Promise<ClassificationResult> {
    const errorStr = this.errorToString(context.error);
    let classification = ErrorClassification.UNKNOWN;
    let confidence = 0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Try to match against known patterns
    for (const [, pattern] of this.errorPatterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(errorStr)) {
          classification = pattern.classification;
          confidence = 0.9;
          severity = pattern.severity;
          break;
        }
      }
      if (confidence > 0) break;
    }

    // Fallback classification based on error properties
    if (confidence === 0) {
      const result = this.classifyByErrorCode(context.errorCode, errorStr);
      classification = result.classification;
      confidence = result.confidence;
      severity = result.severity;
    }

    const suggestedAction = this.suggestRecoveryAction(classification);

    return {
      classification,
      confidence,
      suggestedAction,
      severity,
      explanation: this.getClassificationExplanation(classification),
      metadata: {
        originalError: errorStr,
        errorCode: context.errorCode,
      },
    };
  }

  /**
   * Classify error by error code
   */
  private classifyByErrorCode(
    errorCode?: string,
    errorStr?: string
  ): { classification: ErrorClassification; confidence: number; severity: 'low' | 'medium' | 'high' | 'critical' } {
    if (!errorCode) {
      return {
        classification: ErrorClassification.UNKNOWN,
        confidence: 0.3,
        severity: 'medium',
      };
    }

    const code = parseInt(errorCode, 10);

    if (code >= 500 && code < 600) {
      return {
        classification: ErrorClassification.PROVIDER_FAILURE,
        confidence: 0.8,
        severity: 'high',
      };
    }

    if (code === 401 || code === 403) {
      return {
        classification: ErrorClassification.PERMISSION_ERROR,
        confidence: 0.95,
        severity: 'critical',
      };
    }

    if (code === 429) {
      return {
        classification: ErrorClassification.PROVIDER_FAILURE,
        confidence: 0.8,
        severity: 'medium',
      };
    }

    if (code >= 400 && code < 500) {
      return {
        classification: ErrorClassification.TOOL_FAILURE,
        confidence: 0.7,
        severity: 'medium',
      };
    }

    return {
      classification: ErrorClassification.UNKNOWN,
      confidence: 0.3,
      severity: 'medium',
    };
  }

  /**
   * Suggest recovery action based on error classification
   */
  private suggestRecoveryAction(classification: ErrorClassification): RecoveryAction {
    switch (classification) {
      case ErrorClassification.TIMEOUT:
        return RecoveryAction.RETRY;
      case ErrorClassification.PROVIDER_FAILURE:
        return RecoveryAction.FALLBACK_PROVIDER;
      case ErrorClassification.TOOL_FAILURE:
        return RecoveryAction.FALLBACK_TOOL;
      case ErrorClassification.MODEL_FAILURE:
        return RecoveryAction.FALLBACK_MODEL;
      case ErrorClassification.PERMISSION_ERROR:
        return RecoveryAction.ESCALATE;
      case ErrorClassification.CORRUPT_DATA:
        return RecoveryAction.RECOVER_CHECKPOINT;
      case ErrorClassification.DUPLICATE_TASK:
        return RecoveryAction.MERGE_TASK;
      case ErrorClassification.CONFLICTING_RESULT:
        return RecoveryAction.ARBITRATE;
      case ErrorClassification.STALE_TASK:
        return RecoveryAction.REQUEUE;
      case ErrorClassification.RETRY_LIMIT_EXCEEDED:
        return RecoveryAction.ESCALATE;
      default:
        return RecoveryAction.ESCALATE;
    }
  }

  /**
   * Create a recovery plan based on error classification
   */
  async createRecoveryPlan(
    taskId: TaskId,
    classification: ClassificationResult
  ): Promise<RecoveryPlan> {
    const plan: RecoveryPlan = {
      taskId,
      classification: classification.classification,
      primaryAction: classification.suggestedAction,
      fallbackActions: this.generateFallbackActions(classification.suggestedAction),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      backoffMs: this.config.baseBackoffMs,
      createdAt: new Date(),
      status: 'pending',
    };

    this.recoveryPlans.set(taskId, plan);
    return plan;
  }

  /**
   * Generate fallback actions in priority order
   */
  private generateFallbackActions(primaryAction: RecoveryAction): RecoveryAction[] {
    const fallbacks: RecoveryAction[] = [];

    switch (primaryAction) {
      case RecoveryAction.RETRY:
        fallbacks.push(RecoveryAction.FALLBACK_TOOL, RecoveryAction.FALLBACK_PROVIDER);
        break;
      case RecoveryAction.FALLBACK_PROVIDER:
        fallbacks.push(RecoveryAction.FALLBACK_MODEL, RecoveryAction.ESCALATE);
        break;
      case RecoveryAction.FALLBACK_TOOL:
        fallbacks.push(RecoveryAction.FALLBACK_PROVIDER, RecoveryAction.ESCALATE);
        break;
      case RecoveryAction.FALLBACK_MODEL:
        fallbacks.push(RecoveryAction.FALLBACK_PROVIDER, RecoveryAction.ESCALATE);
        break;
      case RecoveryAction.RECOVER_CHECKPOINT:
        fallbacks.push(RecoveryAction.RETRY, RecoveryAction.ESCALATE);
        break;
      case RecoveryAction.REQUEUE:
        fallbacks.push(RecoveryAction.RETRY, RecoveryAction.ESCALATE);
        break;
      default:
        fallbacks.push(RecoveryAction.ESCALATE);
        break;
    }

    return fallbacks;
  }

  /**
   * Execute recovery plan and update its status
   */
  async executeRecoveryPlan(taskId: TaskId): Promise<RecoveryResult> {
    const plan = this.recoveryPlans.get(taskId);
    if (!plan) {
      throw new Error(`No recovery plan found for task ${taskId}`);
    }

    plan.status = 'executing';
    plan.executedAt = new Date();

    try {
      // Try primary action
      const primaryResult = await this.tryAction(plan.primaryAction, taskId, plan);
      if (primaryResult) {
        plan.status = 'completed';
        plan.completedAt = new Date();
        plan.result = primaryResult;
        return primaryResult;
      }

      // Try fallback actions
      for (const fallbackAction of plan.fallbackActions) {
        const fallbackResult = await this.tryAction(fallbackAction, taskId, plan);
        if (fallbackResult) {
          plan.status = 'completed';
          plan.completedAt = new Date();
          plan.result = fallbackResult;
          return fallbackResult;
        }
      }

      // If all actions failed
      throw new Error(`All recovery actions failed for task ${taskId}`);
    } catch (error) {
      plan.status = 'failed';
      plan.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Try a recovery action and return result
   */
  private async tryAction(
    action: RecoveryAction,
    taskId: TaskId,
    plan: RecoveryPlan
  ): Promise<RecoveryResult | null> {
    // This is a placeholder - actual implementations would be injected
    // For now, we return the structure but don't execute real recovery logic
    if (plan.retryCount >= plan.maxRetries) {
      return null;
    }

    plan.retryCount += 1;
    const backoff = Math.min(
      plan.backoffMs * Math.pow(this.config.backoffMultiplier, plan.retryCount - 1),
      this.config.maxBackoffMs
    );
    plan.backoffMs = backoff;

    return {
      success: false, // Actual implementation would determine this
      actionTaken: action,
      actualRetryCount: plan.retryCount,
      timestamp: new Date(),
    };
  }

  /**
   * Check if a task should be retried based on current state
   */
  async shouldRetry(taskId: TaskId): Promise<boolean> {
    const plan = this.recoveryPlans.get(taskId);
    if (!plan) return false;

    // Check retry limit
    if (plan.retryCount >= plan.maxRetries) {
      return false;
    }

    // Check duration limit
    const duration = Date.now() - plan.createdAt.getTime();
    if (duration > this.config.maxRetryDurationMs) {
      return false;
    }

    return true;
  }

  /**
   * Get recovery plan for a task
   */
  getRecoveryPlan(taskId: TaskId): RecoveryPlan | undefined {
    return this.recoveryPlans.get(taskId);
  }

  /**
   * Clear recovery plan for completed/failed task
   */
  clearRecoveryPlan(taskId: TaskId): void {
    this.recoveryPlans.delete(taskId);
  }

  /**
   * Get error string from Error or string
   */
  private errorToString(error: Error | string): string {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}`;
    }
    return String(error);
  }

  /**
   * Get explanation for error classification
   */
  private getClassificationExplanation(classification: ErrorClassification): string {
    const explanations: Record<ErrorClassification, string> = {
      [ErrorClassification.TIMEOUT]: 'Operation exceeded time limit, will retry with backoff',
      [ErrorClassification.PROVIDER_FAILURE]: 'Provider/service is unavailable, attempting alternate provider',
      [ErrorClassification.TOOL_FAILURE]: 'Tool failed to execute, attempting alternate tool',
      [ErrorClassification.MODEL_FAILURE]: 'Model failed to process, attempting alternate model',
      [ErrorClassification.PERMISSION_ERROR]: 'Permission denied, escalating to human review',
      [ErrorClassification.CORRUPT_DATA]: 'Data corruption detected, recovering from checkpoint',
      [ErrorClassification.DUPLICATE_TASK]: 'Duplicate task detected, merging executions',
      [ErrorClassification.CONFLICTING_RESULT]: 'Conflicting results detected, arbitrating',
      [ErrorClassification.STALE_TASK]: 'Task appears stale, requeuing for execution',
      [ErrorClassification.RETRY_LIMIT_EXCEEDED]: 'Retry limit exceeded, escalating to human',
      [ErrorClassification.UNKNOWN]: 'Unknown error type, attempting general retry',
    };

    return explanations[classification] || 'Recovery action in progress';
  }

  /**
   * Get all active recovery plans
   */
  getActiveRecoveryPlans(): RecoveryPlan[] {
    return Array.from(this.recoveryPlans.values()).filter((plan) => plan.status !== 'completed');
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalPlans: number;
    activeRecoveries: number;
    completedRecoveries: number;
    failedRecoveries: number;
  } {
    const plans = Array.from(this.recoveryPlans.values());
    return {
      totalPlans: plans.length,
      activeRecoveries: plans.filter((p) => p.status === 'executing').length,
      completedRecoveries: plans.filter((p) => p.status === 'completed').length,
      failedRecoveries: plans.filter((p) => p.status === 'failed').length,
    };
  }
}

/**
 * Error pattern definition
 */
interface ErrorPattern {
  patterns: RegExp[];
  classification: ErrorClassification;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default RecoveryEngine;
