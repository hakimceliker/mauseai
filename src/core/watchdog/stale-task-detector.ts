/**
 * Stale Task Detector - Identifies Idle Tasks
 * B10 Phase - Detects and handles tasks that appear idle
 */

import { TaskId, StepId } from '@/src/types/domain';
import { IdleTaskInfo, TaskHealthMetrics } from '../recovery/types';
import { TaskTimeline } from '../recovery/types';

export interface StaleTaskConfig {
  idleThresholdMs: number;
  maxHealthScoreMs: number;
  errorRateThresholdPercent: number;
  minExpectedDurationMs: number;
}

const DEFAULT_CONFIG: StaleTaskConfig = {
  idleThresholdMs: 60000, // 1 minute
  maxHealthScoreMs: 300000, // 5 minutes
  errorRateThresholdPercent: 50,
  minExpectedDurationMs: 10000, // 10 seconds
};

/**
 * Stale Task Detector - Identifies tasks that are idle or unhealthy
 */
export class StaleTaskDetector {
  private config: StaleTaskConfig;
  private taskMetrics: Map<TaskId, TaskHealthMetrics> = new Map();

  constructor(config: Partial<StaleTaskConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Detect if a task is idle
   */
  detectIdleTask(taskId: TaskId, timeline: TaskTimeline): IdleTaskInfo {
    const now = new Date();
    const idleDuration = now.getTime() - timeline.lastActivityTime.getTime();
    const isIdle = idleDuration > this.config.idleThresholdMs;

    const lastStep = timeline.stepExecutions.length > 0
      ? timeline.stepExecutions[timeline.stepExecutions.length - 1].stepId
      : undefined;

    const taskDuration = now.getTime() - timeline.startTime.getTime();
    const expectedDuration = this.estimateExpectedDuration(timeline);
    const percentageComplete = this.calculatePercentageComplete(timeline);

    const reason = this.getIdleReason(
      isIdle,
      idleDuration,
      percentageComplete,
      expectedDuration,
      taskDuration
    );

    return {
      taskId,
      isIdle,
      idleDuration,
      lastUpdate: timeline.lastActivityTime,
      lastStep: lastStep || ('unknown' as any),
      expectedDuration,
      percentageComplete,
      reason,
    };
  }

  /**
   * Calculate task health metrics
   */
  calculateHealthMetrics(taskId: TaskId, timeline: TaskTimeline): TaskHealthMetrics {
    const now = new Date();
    const taskDuration = now.getTime() - timeline.startTime.getTime();

    // Calculate error rate
    const failedSteps = timeline.stepExecutions.filter((s) => s.status === 'failed').length;
    const totalSteps = timeline.stepExecutions.length;
    const errorRate = totalSteps > 0 ? (failedSteps / totalSteps) * 100 : 0;

    // Count recent errors
    const recentErrors = timeline.errorHistory.slice(-10).length;

    // Calculate average step duration
    const avgStepDuration = this.calculateAverageStepDuration(timeline);

    // Estimate remaining time
    const estimatedRemainingTime = Math.max(0, this.estimateRemainingTime(timeline) - taskDuration);

    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore(
      errorRate,
      recentErrors,
      taskDuration,
      estimatedRemainingTime
    );

    const metrics: TaskHealthMetrics = {
      taskId,
      healthScore,
      isHealthy: healthScore >= 50,
      recentErrors,
      errorRate,
      avgStepDuration,
      estimatedRemainingTime,
      lastUpdate: now,
    };

    this.taskMetrics.set(taskId, metrics);
    return metrics;
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateHealthScore(
    errorRate: number,
    recentErrors: number,
    taskDuration: number,
    estimatedRemainingTime: number
  ): number {
    let score = 100;

    // Penalize for error rate
    score -= Math.min(errorRate, 50); // up to 50 points

    // Penalize for recent errors
    score -= Math.min(recentErrors * 5, 30); // up to 30 points

    // Penalize for excessive duration
    const expectedMax = this.config.maxHealthScoreMs;
    if (taskDuration > expectedMax) {
      score -= Math.min(((taskDuration - expectedMax) / expectedMax) * 20, 20);
    }

    return Math.max(0, score);
  }

  /**
   * Estimate expected duration for task
   */
  private estimateExpectedDuration(timeline: TaskTimeline): number {
    if (timeline.stepExecutions.length === 0) {
      return this.config.minExpectedDurationMs;
    }

    const completedSteps = timeline.stepExecutions.filter((s) => s.status === 'completed');
    if (completedSteps.length === 0) {
      return this.config.minExpectedDurationMs;
    }

    const avgStepDuration = this.calculateAverageStepDuration(timeline);
    const totalSteps = timeline.stepExecutions.length;

    // Estimate total duration based on average step time
    return avgStepDuration * Math.max(totalSteps, 5);
  }

  /**
   * Estimate remaining time
   */
  private estimateRemainingTime(timeline: TaskTimeline): number {
    const now = new Date();
    const taskDuration = now.getTime() - timeline.startTime.getTime();
    const expectedDuration = this.estimateExpectedDuration(timeline);

    return Math.max(0, expectedDuration - taskDuration);
  }

  /**
   * Calculate average step duration
   */
  private calculateAverageStepDuration(timeline: TaskTimeline): number {
    const completedSteps = timeline.stepExecutions.filter((s) => s.duration && s.duration > 0);

    if (completedSteps.length === 0) {
      return 0;
    }

    const totalDuration = completedSteps.reduce((sum, step) => sum + (step.duration || 0), 0);
    return totalDuration / completedSteps.length;
  }

  /**
   * Calculate percentage complete
   */
  private calculatePercentageComplete(timeline: TaskTimeline): number {
    if (timeline.stepExecutions.length === 0) {
      return 0;
    }

    const completedSteps = timeline.stepExecutions.filter((s) => s.status === 'completed').length;
    return Math.round((completedSteps / timeline.stepExecutions.length) * 100);
  }

  /**
   * Get idle task reason
   */
  private getIdleReason(
    isIdle: boolean,
    idleDuration: number,
    percentageComplete: number,
    expectedDuration: number,
    taskDuration: number
  ): string {
    if (!isIdle) {
      return 'Task is actively running';
    }

    if (percentageComplete === 100) {
      return 'Task appears completed but not finalized';
    }

    if (taskDuration > expectedDuration * 1.5) {
      return `Task is taking significantly longer than expected (${taskDuration}ms vs ${expectedDuration}ms)`;
    }

    if (idleDuration > 5 * 60 * 1000) {
      // 5 minutes
      return 'Task has been idle for more than 5 minutes';
    }

    return `Task idle for ${Math.round(idleDuration / 1000)} seconds at ${percentageComplete}% complete`;
  }

  /**
   * Determine if task should be requeued
   */
  shouldRequeue(taskId: TaskId): boolean {
    const metrics = this.taskMetrics.get(taskId);
    if (!metrics) return false;

    // Requeue if unhealthy and has been running for too long
    return !metrics.isHealthy && metrics.estimatedRemainingTime > this.config.maxHealthScoreMs;
  }

  /**
   * Get all idle tasks
   */
  getIdleTasks(timelines: Map<TaskId, TaskTimeline>): IdleTaskInfo[] {
    const idleTasks: IdleTaskInfo[] = [];

    for (const [taskId, timeline] of timelines) {
      const idleInfo = this.detectIdleTask(taskId, timeline);
      if (idleInfo.isIdle) {
        idleTasks.push(idleInfo);
      }
    }

    return idleTasks;
  }

  /**
   * Get unhealthy tasks
   */
  getUnhealthyTasks(): TaskId[] {
    const unhealthy: TaskId[] = [];

    for (const [taskId, metrics] of this.taskMetrics) {
      if (!metrics.isHealthy) {
        unhealthy.push(taskId);
      }
    }

    return unhealthy;
  }

  /**
   * Get task metrics
   */
  getTaskMetrics(taskId: TaskId): TaskHealthMetrics | undefined {
    return this.taskMetrics.get(taskId);
  }

  /**
   * Clear metrics for task
   */
  clearTaskMetrics(taskId: TaskId): void {
    this.taskMetrics.delete(taskId);
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): {
    totalTracked: number;
    unhealthyCount: number;
    averageHealthScore: number;
  } {
    const metrics = Array.from(this.taskMetrics.values());

    if (metrics.length === 0) {
      return {
        totalTracked: 0,
        unhealthyCount: 0,
        averageHealthScore: 100,
      };
    }

    const unhealthyCount = metrics.filter((m) => !m.isHealthy).length;
    const averageHealthScore = metrics.reduce((sum, m) => sum + m.healthScore, 0) / metrics.length;

    return {
      totalTracked: metrics.length,
      unhealthyCount,
      averageHealthScore: Math.round(averageHealthScore),
    };
  }
}

export default StaleTaskDetector;
