/**
 * Handoff Engine Tests
 * Comprehensive tests for inter-agent task handoff functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as Domain from '@/src/types/domain';
import {
  HandoffEngine,
  HandoffValidator,
  HandoffEnvelope,
  parseHandoffEnvelope,
  safeParseHandoffEnvelope,
} from '@/src/core/handoff';

describe('Handoff Engine', () => {
  let engine: HandoffEngine;
  const tenantId = 'tenant-1' as Domain.TenantId;
  const taskId = 'task-123' as Domain.TaskId;

  // Mock agents
  const sourceAgent: Domain.Agent = {
    id: 'agent-executor-1' as Domain.AgentId,
    tenant_id: tenantId,
    name: 'Executor Agent',
    type: Domain.AgentType.EXECUTOR,
    capabilities: ['execute', 'process'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const targetAgent: Domain.Agent = {
    id: 'agent-judge-1' as Domain.AgentId,
    tenant_id: tenantId,
    name: 'Judge Agent',
    type: Domain.AgentType.JUDGE,
    capabilities: ['judge', 'review', 'execute'],
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const inactiveAgent: Domain.Agent = {
    id: 'agent-inactive' as Domain.AgentId,
    tenant_id: tenantId,
    name: 'Inactive Agent',
    type: Domain.AgentType.EXECUTOR,
    capabilities: ['execute'],
    is_active: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Mock task
  const task: Domain.Task = {
    id: taskId,
    tenant_id: tenantId,
    user_id: 'user-1',
    workflow_id: 'workflow-1' as Domain.WorkflowId,
    status: Domain.TaskStatus.RUNNING,
    input: { goal: 'test' },
    cost_estimate: 10.5,
    created_at: new Date(),
  };

  // Mock context
  const context = {
    executionState: 'in_progress',
    progress: 50,
    results: { step1: 'completed' },
  };

  // Mock handoff envelope
  const envelope: HandoffEnvelope = {
    sourceAgent: sourceAgent.id,
    targetAgent: targetAgent.id,
    taskId: taskId,
    context,
    reason: 'Escalating to judge for review',
    sha: 'abc123def456',
    schemaVersion: '1.0.0',
    timestamp: new Date(),
  };

  beforeEach(() => {
    engine = new HandoffEngine(tenantId);
  });

  describe('initiateHandoff', () => {
    it('successfully initiates a valid handoff', async () => {
      const result = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Escalating to judge for review',
        envelope,
      });

      expect(result.success).toBe(true);
      expect(result.handoff).toBeDefined();
      expect(result.handoff?.id).toBeDefined();
      expect(result.handoff?.status).toBe(Domain.HandoffStatus.INITIATED);
      expect(result.handoff?.source_agent_id).toBe(sourceAgent.id);
      expect(result.handoff?.target_agent_id).toBe(targetAgent.id);
      expect(result.handoff?.task_id).toBe(taskId);
    });

    it('rejects handoff with missing source agent', async () => {
      const result = await engine.initiateHandoff({
        sourceAgent: null as any,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('rejects handoff with invalid envelope', async () => {
      const invalidEnvelope = {
        sourceAgent: sourceAgent.id,
        // missing required fields
        sha: 'abc123',
      };

      const result = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope: invalidEnvelope as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid handoff envelope');
    });

    it('rejects handoff with empty context', async () => {
      const result = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context: {},
        reason: 'Test',
        envelope,
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('rejects handoff without reason', async () => {
      const result = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: '',
        envelope,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validateHandoff', () => {
    it('validates a valid handoff', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects handoff when task is in completed state', async () => {
      const completedTask: Domain.Task = {
        ...task,
        status: Domain.TaskStatus.COMPLETED,
      };

      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task: completedTask,
        context,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('TASK_FINAL_STATE');
    });

    it('rejects handoff when task is in failed state', async () => {
      const failedTask: Domain.Task = {
        ...task,
        status: Domain.TaskStatus.FAILED,
      };

      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task: failedTask,
        context,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('TASK_FINAL_STATE');
    });

    it('validates agent independence for review handoff', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent: sourceAgent, // same agent
        task,
        context,
        isReviewHandoff: true,
      });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'AGENT_INDEPENDENCE_VIOLATION')
      ).toBe(true);
    });

    it('allows same agent for non-review handoff', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent: sourceAgent,
        task,
        context,
        isReviewHandoff: false,
      });

      // Should be valid (not a review handoff)
      expect(result.valid).toBe(true);
    });

    it('rejects handoff with empty context', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'EMPTY_CONTEXT')).toBe(true);
    });

    it('validates target agent capabilities', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        requiredCapabilities: ['judge', 'review'],
      });

      expect(result.valid).toBe(true);
    });

    it('rejects handoff if target lacks required capabilities', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        requiredCapabilities: ['nonexistent_capability'],
      });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INSUFFICIENT_CAPABILITIES')
      ).toBe(true);
    });

    it('rejects handoff if target agent is inactive', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent: inactiveAgent,
        task,
        context,
      });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'TARGET_AGENT_INACTIVE')
      ).toBe(true);
    });

    it('validates evidence chain', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        evidenceRef: 'evidence-001',
        previousEvidence: ['evidence-001'],
      });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'DUPLICATE_EVIDENCE_REF')
      ).toBe(true);
    });

    it('validates evidence ref format', async () => {
      const result = await engine.validateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        evidenceRef: '!!!invalid!!!',
      });

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'INVALID_EVIDENCE_REF_FORMAT')
      ).toBe(true);
    });
  });

  describe('executeHandoff', () => {
    it('successfully executes a valid handoff', async () => {
      // First initiate
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test handoff',
        envelope,
      });

      expect(initiateResult.success).toBe(true);
      const handoffId = initiateResult.handoff!.id;

      // Then execute
      const executeResult = await engine.executeHandoff(handoffId);

      expect(executeResult.success).toBe(true);
      expect(executeResult.handoff?.status).toBe(Domain.HandoffStatus.COMPLETED);
      expect(executeResult.handoff?.result).toBe(Domain.HandoffResult.SUCCESS);
    });

    it('fails gracefully when handoff not found', async () => {
      const result = await engine.executeHandoff('nonexistent-handoff');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('transitions through states correctly', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;
      expect(initiateResult.handoff?.status).toBe(Domain.HandoffStatus.INITIATED);

      const executeResult = await engine.executeHandoff(handoffId);
      expect(executeResult.handoff?.status).toBe(Domain.HandoffStatus.COMPLETED);
    });
  });

  describe('trackHandoffResult', () => {
    it('successfully tracks successful result', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const trackResult = await engine.trackHandoffResult(
        handoffId,
        Domain.HandoffResult.SUCCESS,
        {
          output: { result: 'completed' },
        }
      );

      expect(trackResult.success).toBe(true);
      expect(trackResult.handoff?.result).toBe(Domain.HandoffResult.SUCCESS);
      expect(trackResult.handoff?.output).toEqual({ result: 'completed' });
    });

    it('successfully tracks failure result with error', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const trackResult = await engine.trackHandoffResult(
        handoffId,
        Domain.HandoffResult.FAILURE,
        {
          error: 'Target agent encountered an error',
        }
      );

      expect(trackResult.success).toBe(true);
      expect(trackResult.handoff?.result).toBe(Domain.HandoffResult.FAILURE);
      expect(trackResult.handoff?.error).toBe('Target agent encountered an error');
      expect(trackResult.handoff?.status).toBe(Domain.HandoffStatus.FAILED);
    });

    it('rejects failure result without error message', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const trackResult = await engine.trackHandoffResult(
        handoffId,
        Domain.HandoffResult.FAILURE
      );

      expect(trackResult.success).toBe(false);
      expect(trackResult.error).toContain('Invalid handoff result');
    });

    it('successfully tracks timeout result', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const trackResult = await engine.trackHandoffResult(
        handoffId,
        Domain.HandoffResult.TIMEOUT
      );

      expect(trackResult.success).toBe(true);
      expect(trackResult.handoff?.result).toBe(Domain.HandoffResult.TIMEOUT);
      expect(trackResult.handoff?.status).toBe(Domain.HandoffStatus.FAILED);
    });

    it('successfully tracks cancelled result', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const trackResult = await engine.trackHandoffResult(
        handoffId,
        Domain.HandoffResult.CANCELLED
      );

      expect(trackResult.success).toBe(true);
      expect(trackResult.handoff?.result).toBe(Domain.HandoffResult.CANCELLED);
      expect(trackResult.handoff?.status).toBe(Domain.HandoffStatus.CANCELLED);
    });

    it('fails when tracking result for nonexistent handoff', async () => {
      const trackResult = await engine.trackHandoffResult(
        'nonexistent-id',
        Domain.HandoffResult.SUCCESS
      );

      expect(trackResult.success).toBe(false);
      expect(trackResult.error).toContain('not found');
    });
  });

  describe('getHandoffHistory', () => {
    it('retrieves empty history initially', async () => {
      const history = await engine.getHandoffHistory();

      expect(history).toEqual([]);
    });

    it('retrieves all handoffs after creation', async () => {
      await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'First handoff',
        envelope,
      });

      await engine.initiateHandoff({
        sourceAgent: targetAgent,
        targetAgent: sourceAgent,
        task,
        context,
        reason: 'Second handoff',
        envelope,
      });

      const history = await engine.getHandoffHistory();

      expect(history).toHaveLength(2);
    });

    it('filters by taskId', async () => {
      const task2: Domain.Task = {
        ...task,
        id: 'task-456' as Domain.TaskId,
      };

      await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Handoff 1',
        envelope,
      });

      const envelope2: HandoffEnvelope = {
        ...envelope,
        taskId: task2.id,
      };

      await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task: task2,
        context,
        reason: 'Handoff 2',
        envelope: envelope2,
      });

      const filtered = await engine.getHandoffHistory({
        taskId: task.id,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].taskId).toBe(task.id);
    });

    it('filters by sourceAgentId', async () => {
      const otherAgent: Domain.Agent = {
        ...sourceAgent,
        id: 'agent-other' as Domain.AgentId,
      };

      await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'From source 1',
        envelope,
      });

      const envelope2: HandoffEnvelope = {
        ...envelope,
        sourceAgent: otherAgent.id,
      };

      await engine.initiateHandoff({
        sourceAgent: otherAgent,
        targetAgent,
        task,
        context,
        reason: 'From source 2',
        envelope: envelope2,
      });

      const filtered = await engine.getHandoffHistory({
        sourceAgentId: sourceAgent.id,
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].sourceAgent).toBe(sourceAgent.id);
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.initiateHandoff({
          sourceAgent,
          targetAgent,
          task,
          context,
          reason: `Handoff ${i}`,
          envelope,
        });
      }

      const limited = await engine.getHandoffHistory({ limit: 2 });

      expect(limited).toHaveLength(2);
    });

    it('returns history in reverse chronological order', async () => {
      const timestamps: number[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await engine.initiateHandoff({
          sourceAgent,
          targetAgent,
          task,
          context,
          reason: `Handoff ${i}`,
          envelope,
        });
        timestamps.push(result.handoff!.initiated_at.getTime());

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const history = await engine.getHandoffHistory();

      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('cancelHandoff', () => {
    it('successfully cancels an active handoff', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      const handoffId = initiateResult.handoff!.id;

      const cancelResult = await engine.cancelHandoff(handoffId);

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.handoff?.status).toBe(Domain.HandoffStatus.CANCELLED);
      expect(cancelResult.handoff?.result).toBe(Domain.HandoffResult.CANCELLED);
    });

    it('fails when cancelling non-existent handoff', async () => {
      const cancelResult = await engine.cancelHandoff('nonexistent-id');

      expect(cancelResult.success).toBe(false);
    });
  });

  describe('getHandoffStatistics', () => {
    it('returns initial statistics', async () => {
      const stats = await engine.getHandoffStatistics();

      expect(stats.totalHandoffs).toBe(0);
      expect(stats.successfulHandoffs).toBe(0);
      expect(stats.failedHandoffs).toBe(0);
      expect(stats.activeHandoffs).toBe(0);
    });

    it('tracks successful handoffs', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      await engine.trackHandoffResult(
        initiateResult.handoff!.id,
        Domain.HandoffResult.SUCCESS
      );

      const stats = await engine.getHandoffStatistics();

      expect(stats.totalHandoffs).toBe(1);
      expect(stats.successfulHandoffs).toBe(1);
      expect(stats.failedHandoffs).toBe(0);
    });

    it('tracks failed handoffs', async () => {
      const initiateResult = await engine.initiateHandoff({
        sourceAgent,
        targetAgent,
        task,
        context,
        reason: 'Test',
        envelope,
      });

      await engine.trackHandoffResult(
        initiateResult.handoff!.id,
        Domain.HandoffResult.FAILURE,
        { error: 'Test error' }
      );

      const stats = await engine.getHandoffStatistics();

      expect(stats.totalHandoffs).toBe(1);
      expect(stats.failedHandoffs).toBe(1);
      expect(stats.successfulHandoffs).toBe(0);
    });
  });

  describe('HandoffValidator', () => {
    it('validates agent independence correctly', () => {
      const result = HandoffValidator.validateAgentIndependence(
        sourceAgent,
        targetAgent,
        true
      );

      expect(result.valid).toBe(true);
    });

    it('rejects same agent for review handoff', () => {
      const result = HandoffValidator.validateAgentIndependence(
        sourceAgent,
        sourceAgent,
        true
      );

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.code === 'AGENT_INDEPENDENCE_VIOLATION')
      ).toBe(true);
    });

    it('validates task state correctly', () => {
      const result = HandoffValidator.validateTaskState(task);

      expect(result.valid).toBe(true);
    });

    it('rejects completed task', () => {
      const completedTask = { ...task, status: Domain.TaskStatus.COMPLETED };
      const result = HandoffValidator.validateTaskState(completedTask);

      expect(result.valid).toBe(false);
    });

    it('can check if handoff can be retried', () => {
      expect(HandoffValidator.canRetryHandoff()).toBe(true);
      expect(HandoffValidator.canRetryHandoff('TIMEOUT')).toBe(true);
      expect(HandoffValidator.canRetryHandoff('INVALID_REQUEST')).toBe(false);
    });
  });

  describe('Envelope parsing', () => {
    it('parses valid envelope', () => {
      const result = parseHandoffEnvelope(envelope);

      expect(result).toEqual(envelope);
    });

    it('safely parses valid envelope', () => {
      const result = safeParseHandoffEnvelope(envelope);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(envelope);
    });

    it('safely handles invalid envelope', () => {
      const invalid = { sourceAgent: 'test' };
      const result = safeParseHandoffEnvelope(invalid);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates schema version format', () => {
      const invalidEnvelope = {
        ...envelope,
        schemaVersion: 'invalid-version',
      };

      const result = safeParseHandoffEnvelope(invalidEnvelope);

      expect(result.success).toBe(false);
    });
  });
});
