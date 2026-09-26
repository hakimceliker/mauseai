import { describe, it, expect, beforeEach } from 'vitest';
import { TaskService } from '@/src/lib/services/task-service';
import * as Domain from '@/src/types/domain';

describe('Task API and Tenant Isolation', () => {
  beforeEach(() => {
    TaskService.clearAll();
  });

  describe('TaskService', () => {
    it('should create a task', () => {
      const tenantId = 'tenant-1' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;
      const input = { prompt: 'test' };

      const task = TaskService.createTask(tenantId, userId, workflowId, input);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.tenant_id).toBe(tenantId);
      expect(task.user_id).toBe(userId);
      expect(task.workflow_id).toBe(workflowId);
      expect(task.status).toBe(Domain.TaskStatus.PENDING);
      expect(task.input).toEqual(input);
      expect(task.cost_estimate).toBe(0);
    });

    it('should retrieve a task by ID', () => {
      const tenantId = 'tenant-1' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      const createdTask = TaskService.createTask(tenantId, userId, workflowId);
      const retrievedTask = TaskService.getTask(createdTask.id, tenantId);

      expect(retrievedTask).toEqual(createdTask);
    });

    it('should enforce tenant isolation on GET', () => {
      const tenantId1 = 'tenant-1' as Domain.TenantId;
      const tenantId2 = 'tenant-2' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      const task = TaskService.createTask(tenantId1, userId, workflowId);

      // Tenant 1 can see the task
      expect(TaskService.getTask(task.id, tenantId1)).toEqual(task);

      // Tenant 2 cannot see the task
      expect(TaskService.getTask(task.id, tenantId2)).toBeNull();
    });

    it('should cancel a pending task', () => {
      const tenantId = 'tenant-1' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      const task = TaskService.createTask(tenantId, userId, workflowId);
      expect(task.status).toBe(Domain.TaskStatus.PENDING);

      const cancelledTask = TaskService.cancelTask(task.id, tenantId);

      expect(cancelledTask).toBeDefined();
      expect(cancelledTask!.status).toBe(Domain.TaskStatus.CANCELLED);
    });

    it('should not cancel a completed task', () => {
      const tenantId = 'tenant-1' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      const task = TaskService.createTask(tenantId, userId, workflowId);
      task.status = Domain.TaskStatus.COMPLETED;

      const cancelledTask = TaskService.cancelTask(task.id, tenantId);

      expect(cancelledTask).toBeNull();
    });

    it('should enforce tenant isolation on cancel', () => {
      const tenantId1 = 'tenant-1' as Domain.TenantId;
      const tenantId2 = 'tenant-2' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      const task = TaskService.createTask(tenantId1, userId, workflowId);

      // Tenant 2 cannot cancel tenant 1's task
      const cancelledTask = TaskService.cancelTask(task.id, tenantId2);

      expect(cancelledTask).toBeNull();
      expect(TaskService.getTask(task.id, tenantId1)!.status).toBe(Domain.TaskStatus.PENDING);
    });

    it('should list all tasks for a tenant', () => {
      const tenantId1 = 'tenant-1' as Domain.TenantId;
      const tenantId2 = 'tenant-2' as Domain.TenantId;
      const userId = 'user-1';
      const workflowId = 'workflow-1' as Domain.WorkflowId;

      TaskService.createTask(tenantId1, userId, workflowId);
      TaskService.createTask(tenantId1, userId, workflowId);
      TaskService.createTask(tenantId2, userId, workflowId);

      const tenant1Tasks = TaskService.getTenantTasks(tenantId1);
      const tenant2Tasks = TaskService.getTenantTasks(tenantId2);

      expect(tenant1Tasks).toHaveLength(2);
      expect(tenant2Tasks).toHaveLength(1);
      expect(tenant1Tasks.every(t => t.tenant_id === tenantId1)).toBe(true);
      expect(tenant2Tasks.every(t => t.tenant_id === tenantId2)).toBe(true);
    });
  });
});
