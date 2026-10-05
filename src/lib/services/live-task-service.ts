import * as Domain from '@/src/types/domain';
import { TaskRepository } from '@/src/lib/db/task-repository';
import { TaskService } from '@/src/lib/services/task-service';
import { resolveAuthProvider } from '@/src/lib/auth/mock-auth';

/**
 * Runtime boundary for task persistence. Production uses the tenant-scoped
 * Supabase repository; local tests can opt into the deterministic in-memory
 * adapter without weakening the production auth boundary.
 */
export class LiveTaskService {
  private static useDatabase() {
    return resolveAuthProvider() !== 'mock';
  }

  static async createTask(
    tenantId: Domain.TenantId,
    userId: string,
    workflowId: Domain.WorkflowId,
    input: Record<string, unknown> = {}
  ) {
    if (this.useDatabase()) {
      return TaskRepository.createTask(tenantId, userId, workflowId, input);
    }
    return TaskService.createTask(tenantId, userId, workflowId, input);
  }

  static async getTask(taskId: Domain.TaskId, tenantId: Domain.TenantId) {
    if (this.useDatabase()) return TaskRepository.getTask(taskId, tenantId);
    return TaskService.getTask(taskId, tenantId);
  }

  static async cancelTask(taskId: Domain.TaskId, tenantId: Domain.TenantId) {
    if (this.useDatabase()) return TaskRepository.cancelTask(taskId, tenantId);
    return TaskService.cancelTask(taskId, tenantId);
  }

  static async getTenantTasks(tenantId: Domain.TenantId) {
    if (this.useDatabase()) return TaskRepository.getTenantTasks(tenantId);
    return TaskService.getTenantTasks(tenantId);
  }
}
