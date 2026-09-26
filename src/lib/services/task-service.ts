import * as Domain from '@/src/types/domain';

// In-memory storage for Phase 3 (will be replaced by database in Phase 4)
const taskStore = new Map<string, Domain.Task>();

// Generate IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export class TaskService {
  /**
   * Create a new task for a tenant
   */
  static createTask(
    tenantId: Domain.TenantId,
    userId: string,
    workflowId: Domain.WorkflowId,
    input: Record<string, unknown> = {}
  ): Domain.Task {
    const task: Domain.Task = {
      id: generateId() as Domain.TaskId,
      tenant_id: tenantId,
      user_id: userId,
      workflow_id: workflowId,
      status: Domain.TaskStatus.PENDING,
      input,
      cost_estimate: 0,
      created_at: new Date(),
    };

    taskStore.set(task.id, task);
    return task;
  }

  /**
   * Get a task by ID (tenant isolation)
   */
  static getTask(taskId: Domain.TaskId, tenantId: Domain.TenantId): Domain.Task | null {
    const task = taskStore.get(taskId);

    // Tenant isolation check
    if (!task || task.tenant_id !== tenantId) {
      return null;
    }

    return task;
  }

  /**
   * Cancel a task (tenant isolation)
   */
  static cancelTask(taskId: Domain.TaskId, tenantId: Domain.TenantId): Domain.Task | null {
    const task = this.getTask(taskId, tenantId);

    if (!task) {
      return null;
    }

    // Only cancel if not already completed or failed
    if (task.status === Domain.TaskStatus.COMPLETED || task.status === Domain.TaskStatus.FAILED) {
      return null;
    }

    task.status = Domain.TaskStatus.CANCELLED;
    taskStore.set(taskId, task);
    return task;
  }

  /**
   * Get all tasks for a tenant
   */
  static getTenantTasks(tenantId: Domain.TenantId): Domain.Task[] {
    return Array.from(taskStore.values()).filter(t => t.tenant_id === tenantId);
  }

  /**
   * For testing: clear all tasks
   */
  static clearAll(): void {
    taskStore.clear();
  }
}
