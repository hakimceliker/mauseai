/**
 * Watchdog - Stuck Task Detection & Monitoring
 * B10 Phase - Detects stuck tasks and coordinates recovery
 */

import { TaskId, StepId, AgentId } from '@/types/domain';
import {
  StuckTaskDetection,
  BlockageType,
  TaskTimeline,
  StepExecution,
  ErrorEvent,
  ReassignmentPlan,
  ErrorClassification,
  RecoveryAction,
} from '../recovery/types';

export interface WatchdogConfig {
  stuckThresholdMs: number;
  idleThresholdMs: number;
  maxConsecutiveErrors: number;
  errorRateThreshold: number; // percentage
  checkIntervalMs: number;
  enableAutoReassignment: boolean;
}

const DEFAULT_CONFIG: WatchdogConfig = {
  stuckThresholdMs: 60000, // 1 minute
  idleThresholdMs: 30000, // 30 seconds
  maxConsecutiveErrors: 3,
  errorRateThreshold: 50, // 50%
  checkIntervalMs: 5000, // 5 seconds
  enableAutoReassignment: false,
};

/**
 * Watchdog - Monitors task execution and detects blockages
 */
export class Watchdog {
  private config: WatchdogConfig;
  private taskTimelines: Map<TaskId, TaskTimeline> = new Map();
  private stuckTasks: Set<TaskId> = new Set();
  private monitoringIntervals: Map<TaskId, NodeJS.Timeout> = new Map();

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start monitoring a task
   */
  startMonitoring(
    taskId: TaskId,
    onStuckDetected?: (detection: StuckTaskDetection) => Promise<void>
  ): void {
    // Initialize timeline
    const timeline: TaskTimeline = {
      taskId,
      startTime: new Date(),
      lastActivityTime: new Date(),
      stepExecutions: [],
      errorHistory: [],
    };

    this.taskTimelines.set(taskId, timeline);

    // Set up monitoring interval
    if (onStuckDetected) {
      const interval = setInterval(async () => {
        const detection = await this.detectStuckTask(taskId);
        if (detection.isStuck && !this.stuckTasks.has(taskId)) {
          this.stuckTasks.add(taskId);
          await onStuckDetected(detection);
        } else if (!detection.isStuck && this.stuckTasks.has(taskId)) {
          this.stuckTasks.delete(taskId);
        }
      }, this.config.checkIntervalMs);

      this.monitoringIntervals.set(taskId, interval);
    }
  }

  /**
   * Stop monitoring a task
   */
  stopMonitoring(taskId: TaskId): void {
    const interval = this.monitoringIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(taskId);
    }
    this.stuckTasks.delete(taskId);
  }

  /**
   * Record step execution
   */
  recordStepExecution(
    taskId: TaskId,
    stepId: StepId,
    execution: {
      startTime: Date;
      endTime?: Date;
      duration?: number;
      status: 'pending' | 'running' | 'completed' | 'failed';
      error?: string;
      retriesUsed: number;
    }
  ): void {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline) return;

    const stepExecution: StepExecution = {
      stepId,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      status: execution.status,
      error: execution.error,
      retriesUsed: execution.retriesUsed,
    };

    timeline.stepExecutions.push(stepExecution);
    timeline.lastActivityTime = execution.endTime || new Date();
  }

  /**
   * Record error event
   */
  recordErrorEvent(
    taskId: TaskId,
    event: {
      timestamp: Date;
      stepId?: StepId;
      error: string;
      classification: ErrorClassification;
      action: RecoveryAction;
    }
  ): void {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline) return;

    const errorEvent: ErrorEvent = {
      timestamp: event.timestamp,
      stepId: event.stepId,
      error: event.error,
      classification: event.classification,
      action: event.action,
    };

    timeline.errorHistory.push(errorEvent);
    timeline.lastActivityTime = event.timestamp;
  }

  /**
   * Detect if a task is stuck
   */
  async detectStuckTask(taskId: TaskId): Promise<StuckTaskDetection> {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline) {
      return {
        taskId,
        isStuck: false,
        stuckDuration: 0,
        blockageType: BlockageType.UNKNOWN,
        lastActivity: new Date(),
        consecutiveErrors: 0,
        reason: 'Task not being monitored',
      };
    }

    const now = new Date();
    const stuckDuration = now.getTime() - timeline.lastActivityTime.getTime();
    const isStuck = stuckDuration > this.config.stuckThresholdMs;

    // Classify blockage type
    const blockageType = this.classifyBlockage(timeline);

    // Get last successful step
    const lastSuccessfulStep = this.findLastSuccessfulStep(taskId);

    // Count consecutive errors
    const consecutiveErrors = this.countConsecutiveErrors(timeline);

    const reason = this.getBlockageReason(blockageType, consecutiveErrors);

    return {
      taskId,
      isStuck,
      stuckDuration,
      blockageType,
      lastActivity: timeline.lastActivityTime,
      lastSuccessfulStep,
      consecutiveErrors,
      reason,
      metadata: {
        totalErrors: timeline.errorHistory.length,
        totalSteps: timeline.stepExecutions.length,
        taskDuration: now.getTime() - timeline.startTime.getTime(),
      },
    };
  }

  /**
   * Classify the type of blockage
   */
  private classifyBlockage(timeline: TaskTimeline): BlockageType {
    const recentErrors = timeline.errorHistory.slice(-5);

    // Check for repeated timeout errors
    const timeoutErrors = recentErrors.filter((e) => e.classification === ErrorClassification.TIMEOUT);
    if (timeoutErrors.length >= 2) {
      return BlockageType.TIMEOUT;
    }

    // Check for repeated provider failures
    const providerErrors = recentErrors.filter(
      (e) => e.classification === ErrorClassification.PROVIDER_FAILURE
    );
    if (providerErrors.length >= 2) {
      return BlockageType.EXTERNAL_DEPENDENCY;
    }

    // Check for permission errors
    const permissionErrors = recentErrors.filter(
      (e) => e.classification === ErrorClassification.PERMISSION_ERROR
    );
    if (permissionErrors.length >= 1) {
      return BlockageType.PERMISSION_WAIT;
    }

    // Check for data corruption
    const dataErrors = recentErrors.filter((e) => e.classification === ErrorClassification.CORRUPT_DATA);
    if (dataErrors.length >= 1) {
      return BlockageType.UNKNOWN;
    }

    // Check for pattern suggesting infinite loop
    if (timeline.stepExecutions.length > 0) {
      const lastSteps = timeline.stepExecutions.slice(-10);
      const uniqueSteps = new Set(lastSteps.map((s) => s.stepId)).size;
      if (uniqueSteps === 1 && lastSteps.length >= 10) {
        return BlockageType.INFINITE_LOOP;
      }
    }

    return BlockageType.UNKNOWN;
  }

  /**
   * Find the last successful step execution
   */
  findLastSuccessfulStep(taskId: TaskId): StepId | undefined {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline) return undefined;

    for (let i = timeline.stepExecutions.length - 1; i >= 0; i--) {
      if (timeline.stepExecutions[i].status === 'completed') {
        return timeline.stepExecutions[i].stepId;
      }
    }

    return undefined;
  }

  /**
   * Count consecutive errors
   */
  private countConsecutiveErrors(timeline: TaskTimeline): number {
    let count = 0;
    for (let i = timeline.errorHistory.length - 1; i >= 0; i--) {
      const error = timeline.errorHistory[i];
      if (!error.error) break;
      count++;
    }
    return count;
  }

  /**
   * Get human-readable blockage reason
   */
  private getBlockageReason(blockageType: BlockageType, consecutiveErrors: number): string {
    switch (blockageType) {
      case BlockageType.TIMEOUT:
        return `Task timeout after ${consecutiveErrors} consecutive timeout errors`;
      case BlockageType.RESOURCE_EXHAUSTION:
        return 'System resources exhausted, unable to continue';
      case BlockageType.DEADLOCK:
        return 'Potential deadlock detected in task execution';
      case BlockageType.INFINITE_LOOP:
        return 'Task appears stuck in infinite loop';
      case BlockageType.EXTERNAL_DEPENDENCY:
        return 'External dependency unavailable after multiple attempts';
      case BlockageType.PERMISSION_WAIT:
        return 'Waiting for permission approval';
      default:
        return `Unknown blockage after ${consecutiveErrors} errors`;
    }
  }

  /**
   * Create a task reassignment plan
   */
  async createReassignmentPlan(
    taskId: TaskId,
    sourceAgent: AgentId,
    targetAgent: AgentId,
    targetEnvironment?: string
  ): Promise<ReassignmentPlan> {
    const lastSuccessfulStep = this.findLastSuccessfulStep(taskId);

    return {
      taskId,
      sourceAgent,
      targetAgent,
      targetEnvironment,
      preserveState: true,
      checkpointId: undefined, // Would be obtained from checkpoint manager
      reason: `Reassigning from ${sourceAgent} to ${targetAgent} due to blockage detection`,
      createdAt: new Date(),
    };
  }

  /**
   * Try fallback route for stuck task
   */
  async tryFallbackRoute(
    taskId: TaskId,
    lastSuccessfulStep: StepId
  ): Promise<{
    nextAttempt: string;
    strategy: string;
  }> {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline) {
      throw new Error(`No timeline for task ${taskId}`);
    }

    const blockageType = this.classifyBlockage(timeline);

    let nextAttempt = '';
    let strategy = '';

    switch (blockageType) {
      case BlockageType.TIMEOUT:
        nextAttempt = 'retry_with_extended_timeout';
        strategy = 'Increase timeout and retry current step';
        break;
      case BlockageType.EXTERNAL_DEPENDENCY:
        nextAttempt = 'wait_and_retry';
        strategy = 'Wait for external service recovery and retry';
        break;
      case BlockageType.PERMISSION_WAIT:
        nextAttempt = 'escalate_approval';
        strategy = 'Escalate to human for approval';
        break;
      case BlockageType.INFINITE_LOOP:
        nextAttempt = 'resume_from_checkpoint';
        strategy = 'Resume from last checkpoint with different approach';
        break;
      case BlockageType.RESOURCE_EXHAUSTION:
        nextAttempt = 'reduce_scope';
        strategy = 'Reduce task scope and retry';
        break;
      default:
        nextAttempt = 'manual_review';
        strategy = 'Escalate to human for manual review';
        break;
    }

    return { nextAttempt, strategy };
  }

  /**
   * Get task timeline
   */
  getTaskTimeline(taskId: TaskId): TaskTimeline | undefined {
    return this.taskTimelines.get(taskId);
  }

  /**
   * Get all stuck tasks
   */
  getStuckTasks(): TaskId[] {
    return Array.from(this.stuckTasks);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    monitoredTasks: number;
    stuckTasks: number;
    activeIntervals: number;
  } {
    return {
      monitoredTasks: this.taskTimelines.size,
      stuckTasks: this.stuckTasks.size,
      activeIntervals: this.monitoringIntervals.size,
    };
  }

  /**
   * Clear monitoring data for task
   */
  clearTaskData(taskId: TaskId): void {
    this.stopMonitoring(taskId);
    this.taskTimelines.delete(taskId);
  }

  /**
   * Get average step duration
   */
  getAverageStepDuration(taskId: TaskId): number {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline || timeline.stepExecutions.length === 0) {
      return 0;
    }

    const totalDuration = timeline.stepExecutions.reduce((sum, step) => sum + (step.duration || 0), 0);
    return totalDuration / timeline.stepExecutions.length;
  }

  /**
   * Get error rate for task
   */
  getErrorRate(taskId: TaskId): number {
    const timeline = this.taskTimelines.get(taskId);
    if (!timeline || timeline.stepExecutions.length === 0) {
      return 0;
    }

    const failedSteps = timeline.stepExecutions.filter((s) => s.status === 'failed').length;
    return (failedSteps / timeline.stepExecutions.length) * 100;
  }
}

export default Watchdog;
