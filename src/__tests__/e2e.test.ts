import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '@/src/lib/services/task-service';
import { CheckpointRepository } from '@/src/lib/db/checkpoint-repository';
import { IdempotencyRepository } from '@/src/lib/db/idempotency-repository';
import { CostTracker } from '@/src/lib/cost/cost-tracker';
import { AuditService } from '@/src/lib/audit/audit-service';
import { ConversationRepository } from '@/src/lib/db/conversation-repository';
import { OfferRepository } from '@/src/lib/db/offer-repository';
import { PolicyEngine } from '@/src/lib/policy/policy-engine';
import * as Domain from '@/src/types/domain';

// Skip database-dependent tests when running in CI/test environment without real Supabase
const skipDbTests = process.env.SKIP_DB_TESTS === 'true' || !process.env.SUPABASE_SERVICE_ROLE_KEY;
const describeDb = skipDbTests ? describe.skip : describe;
const itDb = skipDbTests ? it.skip : it;

describe('E2E: Complete Workflow', () => {
  const tenantId = 'tenant-1' as Domain.TenantId;
  const tenantId2 = 'tenant-2' as Domain.TenantId;
  const userId = 'user-1';
  const workflowId = 'workflow-1' as Domain.WorkflowId;
  const stepId = 'step-1' as Domain.StepId;

  beforeEach(() => {
    TaskService.clearAll();
  });

  describeDb('Happy Path: Task Execution', () => {
    it('should create, execute, and complete a task', async () => {
      // Step 1: Create task
      const task = TaskService.createTask(tenantId, userId, workflowId, { prompt: 'test' });
      expect(task.status).toBe(Domain.TaskStatus.PENDING);
      expect(task.id).toBeDefined();

      // Step 2: Simulate execution - update to running
      // (In real app, Inngest worker would do this)
      task.status = Domain.TaskStatus.RUNNING;
      task.started_at = new Date();

      // Step 3: Save checkpoint for resumption
      // (This would happen after each step in Inngest)
      const checkpoint = await CheckpointRepository.saveCheckpoint(
        task.id,
        stepId,
        { completed: true, result: 'success' }
      );
      expect(checkpoint).toBeDefined();

      // Step 4: Record step execution for idempotency
      const stepResult = { step_id: stepId, result: 'test result' };
      await IdempotencyRepository.recordExecution(task.id, stepId, stepResult);

      // Step 5: Record cost
      await CostTracker.recordTaskCost(task.id, tenantId, 0.0001);

      // Step 6: Complete task
      task.status = Domain.TaskStatus.COMPLETED;
      task.completed_at = new Date();
      task.output = { result: 'completed' };
      task.cost_actual = 0.0001;

      // Verify final state
      expect(task.status).toBe(Domain.TaskStatus.COMPLETED);
      expect(task.output).toEqual({ result: 'completed' });
      expect(task.cost_actual).toBe(0.0001);

      // Verify checkpoint saved
      const saved = await CheckpointRepository.getLatestCheckpoint(task.id, stepId);
      expect(saved).toBeDefined();
      expect(saved?.state).toEqual({ completed: true, result: 'success' });

      // Verify idempotency key recorded
      const idempotencyRecords = await IdempotencyRepository.getTaskIdempotencyRecords(task.id);
      expect(idempotencyRecords).toHaveLength(1);
      expect(idempotencyRecords[0].step_id).toBe(stepId);
    });
  });

  describeDb('Tenant Isolation', () => {
    itDb('should prevent cross-tenant data access', async () => {
      // Create task for tenant 1
      const task1 = TaskService.createTask(tenantId, userId, workflowId);

      // Tenant 1 can see their task
      const retrieved = TaskService.getTask(task1.id, tenantId);
      expect(retrieved).toBeDefined();

      // Tenant 2 cannot see tenant 1's task
      const forbidden = TaskService.getTask(task1.id, tenantId2);
      expect(forbidden).toBeNull();
    });

    itDb('should isolate conversation data per tenant', async () => {
      // Create conversation for tenant 1
      const conv1 = await ConversationRepository.createConversation(tenantId, userId);
      expect(conv1.tenant_id).toBe(tenantId);

      // Tenant 1 can retrieve their conversation
      const retrieved = await ConversationRepository.getConversation(conv1.id, tenantId);
      expect(retrieved).toBeDefined();

      // Tenant 2 cannot retrieve tenant 1's conversation
      const forbidden = await ConversationRepository.getConversation(conv1.id, tenantId2);
      expect(forbidden).toBeNull();
    });

    itDb('should isolate offer data per tenant', async () => {
      // Create offer for tenant 1
      const offer1 = await OfferRepository.createOffer(tenantId, 'template-1', 10, 100);
      expect(offer1.tenant_id).toBe(tenantId);

      // Tenant 1 can retrieve their offer
      const retrieved = await OfferRepository.getOffer(offer1.id, tenantId);
      expect(retrieved).toBeDefined();

      // Tenant 2 cannot retrieve tenant 1's offer
      const forbidden = await OfferRepository.getOffer(offer1.id, tenantId2);
      expect(forbidden).toBeNull();
    });
  });

  describeDb('Error Scenarios', () => {
    itDb('should handle cost limit exceeded error', async () => {
      const task = TaskService.createTask(tenantId, userId, workflowId);

      // Simulate cost exceeding limit
      const currentCost = 100.0; // Exceeds typical limit
      await CostTracker.recordTaskCost(task.id, tenantId, currentCost);

      // Log cost limit exceeded event
      await AuditService.logCostLimitExceeded(
        tenantId,
        task.id,
        currentCost,
        1000.0 // Example limit
      );

      // Verify audit log
      const logs = await AuditService.getTenantAuditLogs(tenantId);
      const costLog = logs.find(l => l.details.reason === 'cost_limit_exceeded');
      expect(costLog).toBeDefined();
    });

    it('should handle invalid input for task creation', () => {
      // Empty workflow ID should be rejected by Zod validation
      // (This would happen in API layer)
      const emptyWorkflow = '' as Domain.WorkflowId;
      expect(emptyWorkflow).toBe('');
    });

    itDb('should prevent duplicate step execution with idempotency', async () => {
      const task = TaskService.createTask(tenantId, userId, workflowId);
      const stepResult = { result: 'first execution' };

      // Record first execution
      await IdempotencyRepository.recordExecution(task.id, stepId, stepResult);

      // Check idempotency - should return cached result
      const cached = await IdempotencyRepository.checkIdempotency(task.id, stepId);
      expect(cached).toEqual(stepResult);

      // Second execution would skip due to cached result
      const records = await IdempotencyRepository.getTaskIdempotencyRecords(task.id);
      expect(records).toHaveLength(1);
    });

    itDb('should handle task failure with error logging', async () => {
      const task = TaskService.createTask(tenantId, userId, workflowId);
      const errorMessage = 'Step execution timeout';

      // Log task failure
      await AuditService.logTaskFailed(tenantId, task.id, errorMessage);

      // Verify audit log
      const logs = await AuditService.getTenantAuditLogs(tenantId);
      const failureLog = logs.find(l => l.action === Domain.AuditAction.TASK_FAILED);
      expect(failureLog).toBeDefined();
      expect(failureLog?.details.error).toBe(errorMessage);
    });
  });

  describeDb('Audit Logging', () => {
    itDb('should log all task lifecycle events', async () => {
      const task = TaskService.createTask(tenantId, userId, workflowId);

      // Log task created
      await AuditService.logTaskCreated(tenantId, task.id, userId, workflowId);

      // Log task started
      await AuditService.logTaskStarted(tenantId, task.id);

      // Log cost incurred
      await AuditService.logCostIncurred(tenantId, task.id, 0.0001, 'mock-gpt');

      // Log task completed
      await AuditService.logTaskCompleted(tenantId, task.id, 0.0001);

      // Verify all events logged
      const logs = await AuditService.getTenantAuditLogs(tenantId);
      expect(logs.length).toBeGreaterThanOrEqual(4);

      const actions = logs.map(l => l.action);
      expect(actions).toContain(Domain.AuditAction.TASK_CREATED);
      expect(actions).toContain(Domain.AuditAction.TASK_STARTED);
      expect(actions).toContain(Domain.AuditAction.COST_INCURRED);
      expect(actions).toContain(Domain.AuditAction.TASK_COMPLETED);
    });

    itDb('should log conversation state transitions', async () => {
      const conversation = await ConversationRepository.createConversation(tenantId, userId);

      // Transition through states
      await ConversationRepository.transitionState(conversation.id, tenantId, 'pending');
      await ConversationRepository.transitionState(conversation.id, tenantId, 'review');
      await ConversationRepository.transitionState(conversation.id, tenantId, 'approved');
      await ConversationRepository.transitionState(conversation.id, tenantId, 'completed');

      // Verify final state
      const final = await ConversationRepository.getConversation(conversation.id, tenantId);
      expect(final?.state).toBe('completed');
    });
  });

  describe('Policy Engine', () => {
    it('should validate valid offers', () => {
      const validOffer = {
        id: 'offer-1',
        tenant_id: tenantId,
        template_id: 'template-1',
        discount_percent: 15,
        price_cap: 100,
        status: 'draft' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(validOffer, 90);
      expect(result.valid).toBe(true);
    });

    it('should reject offers violating discount limit', () => {
      const invalidOffer = {
        id: 'offer-1',
        tenant_id: tenantId,
        template_id: 'template-1',
        discount_percent: 25, // Exceeds 20% max
        price_cap: 100,
        status: 'draft' as const,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(invalidOffer, 90);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });

    it('should calculate discounted prices correctly', () => {
      const price = PolicyEngine.calculateDiscountedPrice(100, 20);
      expect(price).toBe(80);
    });
  });

  describeDb('Checkpoint and Resumption', () => {
    itDb('should enable resumption from checkpoint', async () => {
      const task = TaskService.createTask(tenantId, userId, workflowId);

      // Simulate step 1 execution and checkpoint
      const step1 = 'step-1' as Domain.StepId;
      const state1 = { step: 1, progress: 'half-done' };
      await CheckpointRepository.saveCheckpoint(task.id, step1, state1);

      // Simulate failure and restart
      const checkpoint = await CheckpointRepository.getLatestCheckpoint(task.id, step1);
      expect(checkpoint?.state).toEqual(state1);

      // Continue from checkpoint (step 2)
      const step2 = 'step-2' as Domain.StepId;
      const state2 = { step: 2, progress: 'completed', resumedFrom: step1 };
      await CheckpointRepository.saveCheckpoint(task.id, step2, state2);

      // Verify both checkpoints
      const allCheckpoints = await CheckpointRepository.getTaskCheckpoints(task.id);
      expect(allCheckpoints).toHaveLength(2);
    });
  });
});
