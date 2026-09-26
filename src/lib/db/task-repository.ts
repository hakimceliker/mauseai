import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from './supabase';

export class TaskRepository {
  /**
   * Create a new task in the database
   */
  static async createTask(
    tenantId: Domain.TenantId,
    userId: string,
    workflowId: Domain.WorkflowId,
    input: Record<string, unknown> = {}
  ): Promise<Domain.Task> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tasks')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        workflow_id: workflowId,
        status: Domain.TaskStatus.PENDING,
        input,
        cost_estimate: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return this.formatTask(data);
  }

  /**
   * Get a task by ID (tenant isolation)
   */
  static async getTask(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId
  ): Promise<Domain.Task | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tasks')
      .select()
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get task: ${error.message}`);
    }

    return data ? this.formatTask(data) : null;
  }

  /**
   * Cancel a task (tenant isolation)
   */
  static async cancelTask(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId
  ): Promise<Domain.Task | null> {
    const db = getSupabaseAdmin();

    // Check task exists and get current status
    const task = await this.getTask(taskId, tenantId);
    if (!task) {
      return null;
    }

    // Cannot cancel if already completed or failed
    if (
      task.status === Domain.TaskStatus.COMPLETED ||
      task.status === Domain.TaskStatus.FAILED
    ) {
      return null;
    }

    const { data, error } = await db
      .from('tasks')
      .update({
        status: Domain.TaskStatus.CANCELLED,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel task: ${error.message}`);
    }

    return this.formatTask(data);
  }

  /**
   * Get all tasks for a tenant
   */
  static async getTenantTasks(tenantId: Domain.TenantId): Promise<Domain.Task[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tasks')
      .select()
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get tenant tasks: ${error.message}`);
    }

    return data.map(task => this.formatTask(task));
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId,
    status: Domain.TaskStatus,
    output?: Record<string, unknown>,
    error?: string
  ): Promise<Domain.Task | null> {
    const db = getSupabaseAdmin();

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (output !== undefined) {
      updates.output = output;
    }

    if (error !== undefined) {
      updates.error = error;
    }

    if (status === Domain.TaskStatus.RUNNING) {
      updates.started_at = new Date().toISOString();
    }

    if (status === Domain.TaskStatus.COMPLETED || status === Domain.TaskStatus.FAILED) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error: updateError } = await db
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update task: ${updateError.message}`);
    }

    return data ? this.formatTask(data) : null;
  }

  /**
   * Update task cost
   */
  static async updateTaskCost(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId,
    costActual: number
  ): Promise<Domain.Task | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tasks')
      .update({
        cost_actual: costActual,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task cost: ${error.message}`);
    }

    return data ? this.formatTask(data) : null;
  }

  /**
   * Format database task to domain model
   */
  private static formatTask(data: Record<string, unknown>): Domain.Task {
    return {
      id: data.id as Domain.TaskId,
      tenant_id: data.tenant_id as Domain.TenantId,
      user_id: data.user_id as string,
      workflow_id: data.workflow_id as Domain.WorkflowId,
      status: data.status as Domain.TaskStatus,
      input: data.input as Record<string, unknown>,
      output: (data.output as Record<string, unknown> | null) || undefined,
      error: (data.error as string | null) || undefined,
      cost_estimate: Number(data.cost_estimate),
      cost_actual: data.cost_actual ? Number(data.cost_actual) : undefined,
      created_at: new Date(data.created_at as string),
      started_at: data.started_at ? new Date(data.started_at as string) : undefined,
      completed_at: data.completed_at ? new Date(data.completed_at as string) : undefined,
    };
  }
}
