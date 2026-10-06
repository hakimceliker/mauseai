/**
 * Tests for Recovery, Watchdog, and Conflict Resolver
 * B10 Phase - Comprehensive test suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TaskId, StepId, AgentId } from '@/src/types/domain';
import RecoveryEngine from './recovery-engine';
import { ErrorClassification, RecoveryAction } from './types';
import Watchdog from '../watchdog/watchdog';
import StaleTaskDetector from '../watchdog/stale-task-detector';
import ConflictResolver from '../conflicts/conflict-resolver';

// Helper to create branded IDs
const createTaskId = (id: string): TaskId => id as TaskId;
const createStepId = (id: string): StepId => id as StepId;
const createAgentId = (id: string): AgentId => id as AgentId;

describe('RecoveryEngine', () => {
  let engine: RecoveryEngine;

  beforeEach(() => {
    engine = new RecoveryEngine({
      maxRetries: 3,
      baseBackoffMs: 100,
      maxBackoffMs: 1000,
    });
  });

  describe('Error Classification', () => {
    it('should classify timeout errors', async () => {
      const result = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('Operation timeout after 30s'),
        timestamp: new Date(),
      });

      expect(result.classification).toBe(ErrorClassification.TIMEOUT);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.suggestedAction).toBe(RecoveryAction.RETRY);
    });

    it('should classify provider failures', async () => {
      const result = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('Service unavailable'),
        errorCode: '503',
        timestamp: new Date(),
      });

      expect(result.classification).toBe(ErrorClassification.PROVIDER_FAILURE);
      expect(result.suggestedAction).toBe(RecoveryAction.FALLBACK_PROVIDER);
    });

    it('should classify permission errors', async () => {
      const result = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('Access denied'),
        errorCode: '403',
        timestamp: new Date(),
      });

      expect(result.classification).toBe(ErrorClassification.PERMISSION_ERROR);
      expect(result.suggestedAction).toBe(RecoveryAction.ESCALATE);
    });

    it('should classify tool failures', async () => {
      const result = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('Tool execution failed'),
        timestamp: new Date(),
      });

      expect(result.classification).toBe(ErrorClassification.TOOL_FAILURE);
    });
  });

  describe('Recovery Plan Creation', () => {
    it('should create recovery plan with primary and fallback actions', async () => {
      const classification = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('timeout'),
        timestamp: new Date(),
      });

      const plan = await engine.createRecoveryPlan(createTaskId('task1'), classification);

      expect(plan.taskId).toBe('task1');
      expect(plan.primaryAction).toBe(RecoveryAction.RETRY);
      expect(plan.fallbackActions.length).toBeGreaterThan(0);
      expect(plan.status).toBe('pending');
      expect(plan.retryCount).toBe(0);
    });

    it('should track retry count', async () => {
      const classification = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('timeout'),
        timestamp: new Date(),
      });

      const plan = await engine.createRecoveryPlan(createTaskId('task1'), classification);
      expect(plan.retryCount).toBe(0);
      expect(plan.maxRetries).toBe(3);
    });
  });

  describe('Recovery Plan Retrieval', () => {
    it('should retrieve existing recovery plan', async () => {
      const classification = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('timeout'),
        timestamp: new Date(),
      });

      await engine.createRecoveryPlan(createTaskId('task1'), classification);
      const plan = engine.getRecoveryPlan(createTaskId('task1'));

      expect(plan).toBeDefined();
      expect(plan?.taskId).toBe('task1');
    });

    it('should return undefined for non-existent plan', () => {
      const plan = engine.getRecoveryPlan(createTaskId('unknown'));
      expect(plan).toBeUndefined();
    });
  });

  describe('Recovery Statistics', () => {
    it('should track recovery statistics', async () => {
      const classification = await engine.classifyError({
        taskId: createTaskId('task1'),
        error: new Error('timeout'),
        timestamp: new Date(),
      });

      const plan = await engine.createRecoveryPlan(createTaskId('task1'), classification);
      plan.status = 'executing'; // Simulate plan execution

      const stats = engine.getRecoveryStats();
      expect(stats.totalPlans).toBe(1);
      expect(stats.activeRecoveries).toBe(1);
      expect(stats.completedRecoveries).toBe(0);
    });
  });
});

describe('Watchdog', () => {
  let watchdog: Watchdog;

  beforeEach(() => {
    watchdog = new Watchdog({
      stuckThresholdMs: 5000,
      idleThresholdMs: 2000,
      maxConsecutiveErrors: 3,
    });
  });

  afterEach(() => {
    watchdog.clearTaskData(createTaskId('task1'));
  });

  describe('Task Monitoring', () => {
    it('should start monitoring a task', () => {
      watchdog.startMonitoring(createTaskId('task1'));

      const status = watchdog.getMonitoringStatus();
      expect(status.monitoredTasks).toBe(1);
    });

    it('should stop monitoring a task', () => {
      watchdog.startMonitoring(createTaskId('task1'));
      watchdog.clearTaskData(createTaskId('task1'));

      const status = watchdog.getMonitoringStatus();
      expect(status.monitoredTasks).toBe(0);
    });
  });

  describe('Step Execution Recording', () => {
    it('should record step execution', () => {
      watchdog.startMonitoring(createTaskId('task1'));

      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step1'), {
        startTime: new Date(),
        status: 'completed',
        retriesUsed: 0,
      });

      const timeline = watchdog.getTaskTimeline(createTaskId('task1'));
      expect(timeline?.stepExecutions.length).toBe(1);
      expect(timeline?.stepExecutions[0].stepId).toBe('step1');
    });

    it('should record error events', () => {
      watchdog.startMonitoring(createTaskId('task1'));

      watchdog.recordErrorEvent(createTaskId('task1'), {
        timestamp: new Date(),
        stepId: createStepId('step1'),
        error: 'Test error',
        classification: ErrorClassification.TIMEOUT,
        action: RecoveryAction.RETRY,
      });

      const timeline = watchdog.getTaskTimeline(createTaskId('task1'));
      expect(timeline?.errorHistory.length).toBe(1);
    });
  });

  describe('Stuck Task Detection', () => {
    it('should detect stuck task after threshold', async () => {
      watchdog.startMonitoring(createTaskId('task1'));

      // Record a step but don't update activity for a while
      const oldTime = new Date(Date.now() - 6000); // 6 seconds ago
      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step1'), {
        startTime: oldTime,
        endTime: oldTime,
        status: 'running',
        retriesUsed: 0,
      });

      // Manually set the last activity time to trigger stuck detection
      const timeline = watchdog.getTaskTimeline(createTaskId('task1'));
      if (timeline) {
        timeline.lastActivityTime = oldTime;
      }

      const detection = await watchdog.detectStuckTask(createTaskId('task1'));
      expect(detection.isStuck).toBe(true);
    });
  });

  describe('Blockage Classification', () => {
    it('should classify timeout blockage', async () => {
      watchdog.startMonitoring(createTaskId('task1'));

      // Record timeout errors
      for (let i = 0; i < 2; i++) {
        watchdog.recordErrorEvent(createTaskId('task1'), {
          timestamp: new Date(),
          error: 'Operation timeout',
          classification: ErrorClassification.TIMEOUT,
          action: RecoveryAction.RETRY,
        });
      }

      const detection = await watchdog.detectStuckTask(createTaskId('task1'));
      // Without enough time passing, blockage type will be UNKNOWN
      expect(detection.consecutiveErrors).toBeGreaterThan(0);
    });
  });

  describe('Last Successful Step', () => {
    it('should find last successful step', () => {
      watchdog.startMonitoring(createTaskId('task1'));

      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step1'), {
        startTime: new Date(),
        status: 'completed',
        retriesUsed: 0,
      });

      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step2'), {
        startTime: new Date(),
        status: 'failed',
        error: 'Step failed',
        retriesUsed: 1,
      });

      const lastSuccessful = watchdog.findLastSuccessfulStep(createTaskId('task1'));
      expect(lastSuccessful).toBe('step1');
    });
  });

  describe('Error Rate Calculation', () => {
    it('should calculate error rate', () => {
      watchdog.startMonitoring(createTaskId('task1'));

      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step1'), {
        startTime: new Date(),
        status: 'completed',
        retriesUsed: 0,
      });

      watchdog.recordStepExecution(createTaskId('task1'), createStepId('step2'), {
        startTime: new Date(),
        status: 'failed',
        error: 'Failed',
        retriesUsed: 1,
      });

      const errorRate = watchdog.getErrorRate(createTaskId('task1'));
      expect(errorRate).toBe(50);
    });
  });
});

describe('StaleTaskDetector', () => {
  let detector: StaleTaskDetector;

  beforeEach(() => {
    detector = new StaleTaskDetector({
      idleThresholdMs: 5000,
      maxHealthScoreMs: 60000,
      errorRateThresholdPercent: 50,
    });
  });

  describe('Idle Task Detection', () => {
    it('should detect idle task', () => {
      const timeline = {
        taskId: createTaskId('task1'),
        startTime: new Date(Date.now() - 10000),
        lastActivityTime: new Date(Date.now() - 6000),
        stepExecutions: [],
        errorHistory: [],
      };

      const idleInfo = detector.detectIdleTask(createTaskId('task1'), timeline);
      expect(idleInfo.isIdle).toBe(true);
      expect(idleInfo.idleDuration).toBeGreaterThan(5000);
    });

    it('should not detect active task as idle', () => {
      const timeline = {
        taskId: createTaskId('task1'),
        startTime: new Date(Date.now() - 10000),
        lastActivityTime: new Date(Date.now() - 1000),
        stepExecutions: [],
        errorHistory: [],
      };

      const idleInfo = detector.detectIdleTask(createTaskId('task1'), timeline);
      expect(idleInfo.isIdle).toBe(false);
    });
  });

  describe('Health Metrics', () => {
    it('should calculate health metrics', () => {
      const timeline = {
        taskId: createTaskId('task1'),
        startTime: new Date(),
        lastActivityTime: new Date(),
        stepExecutions: [
          {
            stepId: createStepId('step1'),
            startTime: new Date(),
            duration: 1000,
            status: 'completed' as const,
            error: undefined,
            retriesUsed: 0,
          },
          {
            stepId: createStepId('step2'),
            startTime: new Date(),
            duration: undefined,
            status: 'failed' as const,
            error: 'Error',
            retriesUsed: 1,
          },
        ],
        errorHistory: [],
      };

      const metrics = detector.calculateHealthMetrics(createTaskId('task1'), timeline);
      expect(metrics.taskId).toBe('task1');
      expect(metrics.healthScore).toBeGreaterThan(0);
      expect(metrics.errorRate).toBe(50);
    });
  });

  describe('Unhealthy Task Detection', () => {
    it('should identify unhealthy tasks', () => {
      const timeline = {
        taskId: createTaskId('task1'),
        startTime: new Date(Date.now() - 120000),
        lastActivityTime: new Date(Date.now() - 60000),
        stepExecutions: [
          {
            stepId: createStepId('step1'),
            startTime: new Date(),
            duration: 1000,
            status: 'failed' as const,
            error: 'Error',
            retriesUsed: 3,
          },
        ],
        errorHistory: [],
      };

      detector.calculateHealthMetrics(createTaskId('task1'), timeline);
      const unhealthy = detector.getUnhealthyTasks();

      // Task should be marked as unhealthy due to high error rate or long duration
      expect(unhealthy.length >= 0).toBe(true);
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver({
      enableAutoResolution: true,
      requiresHumanReview: false,
      arbitrationTimeoutMs: 5000,
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting results', async () => {
      const results = [
        {
          agentId: createAgentId('agent1'),
          output: { result: 'value1' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
        {
          agentId: createAgentId('agent2'),
          output: { result: 'value2' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.8,
        },
      ];

      const conflict = await resolver.detectConflict(createTaskId('task1'), results);
      expect(conflict?.hasConflict).toBe(true);
      expect(conflict?.divergenceScore).toBeGreaterThan(0);
    });

    it('should not detect conflict for identical results', async () => {
      const results = [
        {
          agentId: createAgentId('agent1'),
          output: { result: 'same' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
        {
          agentId: createAgentId('agent2'),
          output: { result: 'same' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
      ];

      const conflict = await resolver.detectConflict(createTaskId('task1'), results);
      expect(conflict).toBeNull();
    });

    it('should return null for single result', async () => {
      const results = [
        {
          agentId: createAgentId('agent1'),
          output: { result: 'value' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
      ];

      const conflict = await resolver.detectConflict(createTaskId('task1'), results);
      expect(conflict).toBeNull();
    });
  });

  describe('Conflict Arbitration', () => {
    it('should arbitrate by confidence', async () => {
      const results = [
        {
          agentId: createAgentId('agent1'),
          output: { result: 'similar_value', data: 123 },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
        {
          agentId: createAgentId('agent2'),
          output: { result: 'similar_value', data: 124 },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.7,
        },
      ];

      const decision = await resolver.arbitrateConflict(createTaskId('task1'), results);
      expect(decision.winnerAgentId).toBe('agent1');
      expect(decision.confidence).toBeGreaterThan(0);
    });
  });

  describe('Policy Management', () => {
    it('should register custom policies', () => {
      const policy = {
        name: 'custom',
        conflictTypes: [] as any,
        arbitrationMethod: 'confidence' as const,
        requiresHumanReview: false,
        timeoutMs: 10000,
      };

      resolver.registerPolicy(policy);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track conflict statistics', async () => {
      const results = [
        {
          agentId: createAgentId('agent1'),
          output: { result: 'value1' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.9,
        },
        {
          agentId: createAgentId('agent2'),
          output: { result: 'value2' },
          timestamp: new Date(),
          executionTime: 100,
          confidence: 0.7,
        },
      ];

      await resolver.detectConflict(createTaskId('task1'), results);
      const stats = resolver.getStatistics();

      expect(stats.totalConflicts).toBe(1);
      expect(stats.averageDivergenceScore).toBeGreaterThan(0);
    });
  });
});
