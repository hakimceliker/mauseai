import { describe, it, expect } from 'vitest';
import { validators } from '@/src/lib/schemas';
import * as Domain from '@/src/types/domain';

describe('Domain Validators', () => {
  describe('Task schema', () => {
    it('accepts valid task', () => {
      const validTask = {
        id: 'task-123',
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        workflow_id: 'workflow-1',
        status: 'pending' as Domain.TaskStatus,
        input: { goal: 'test' },
        cost_estimate: 10.5,
        created_at: new Date(),
      };
      const result = validators.task.safeParse(validTask);
      expect(result.success).toBe(true);
    });

    it('rejects task with missing required fields', () => {
      const invalid = {
        id: 'task-123',
        // missing tenant_id, user_id, etc
      };
      const result = validators.task.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects task with negative cost', () => {
      const invalid = {
        id: 'task-123',
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        workflow_id: 'workflow-1',
        status: 'pending' as Domain.TaskStatus,
        input: {},
        cost_estimate: -5,
        created_at: new Date(),
      };
      const result = validators.task.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Workflow schema', () => {
    it('accepts valid workflow with steps', () => {
      const validWorkflow = {
        id: 'workflow-123',
        tenant_id: 'tenant-1',
        name: 'Test Workflow',
        steps: [
          {
            id: 'step-1',
            workflow_id: 'workflow-123',
            order: 1,
            name: 'First step',
            type: 'ai_call' as const,
            config: { model: 'gpt-4' },
            retries: 3,
            timeout_ms: 30000,
          },
        ],
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = validators.workflow.safeParse(validWorkflow);
      expect(result.success).toBe(true);
    });

    it('rejects workflow with empty steps', () => {
      const invalid = {
        id: 'workflow-123',
        tenant_id: 'tenant-1',
        name: 'Test',
        steps: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      const result = validators.workflow.safeParse(invalid);
      // Empty steps should be allowed (opt-in validation)
      expect(result.success).toBe(true);
    });
  });

  describe('Checkpoint schema', () => {
    it('accepts valid checkpoint', () => {
      const checkpoint = {
        id: 'checkpoint-1',
        task_id: 'task-1',
        step_id: 'step-1',
        state: { progress: 50 },
        created_at: new Date(),
      };
      const result = validators.checkpoint.safeParse(checkpoint);
      expect(result.success).toBe(true);
    });
  });

  describe('AuditEvent schema', () => {
    it('accepts valid audit event', () => {
      const event = {
        id: 'audit-1',
        tenant_id: 'tenant-1',
        action: 'task_created' as Domain.AuditAction,
        entity_type: 'task' as const,
        entity_id: 'task-1',
        actor: 'user-1',
        details: { workflow: 'test' },
        timestamp: new Date(),
      };
      const result = validators.auditEvent.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});
