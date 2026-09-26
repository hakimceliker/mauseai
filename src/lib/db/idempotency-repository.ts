import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from './supabase';

/**
 * Idempotency repository for duplicate detection
 * Prevents duplicate execution of steps within a task
 */
export class IdempotencyRepository {
  /**
   * Generate idempotency key from task and step
   */
  static generateKey(taskId: Domain.TaskId, stepId: Domain.StepId): string {
    return `${taskId}:${stepId}`;
  }

  /**
   * Check if a step execution was already processed
   * Returns the cached result if found
   */
  static async checkIdempotency(
    taskId: Domain.TaskId,
    stepId: Domain.StepId
  ): Promise<Record<string, unknown> | null> {
    const db = getSupabaseAdmin();
    const idempotencyKey = this.generateKey(taskId, stepId);

    const { data, error } = await db
      .from('idempotency_keys')
      .select('result')
      .eq('task_id', taskId)
      .eq('step_id', stepId)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check idempotency: ${error.message}`);
    }

    return data ? (data.result as Record<string, unknown>) : null;
  }

  /**
   * Record the result of a step execution
   * Prevents duplicate execution on retry
   */
  static async recordExecution(
    taskId: Domain.TaskId,
    stepId: Domain.StepId,
    result: Record<string, unknown>
  ): Promise<void> {
    const db = getSupabaseAdmin();
    const idempotencyKey = this.generateKey(taskId, stepId);

    const { error } = await db
      .from('idempotency_keys')
      .upsert(
        {
          task_id: taskId,
          step_id: stepId,
          idempotency_key: idempotencyKey,
          result,
        },
        {
          onConflict: 'task_id,step_id,idempotency_key',
        }
      );

    if (error) {
      throw new Error(`Failed to record idempotency key: ${error.message}`);
    }
  }

  /**
   * Get all idempotency records for a task
   */
  static async getTaskIdempotencyRecords(taskId: Domain.TaskId): Promise<
    Array<{
      step_id: Domain.StepId;
      result: Record<string, unknown>;
    }>
  > {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('idempotency_keys')
      .select('step_id, result')
      .eq('task_id', taskId);

    if (error) {
      throw new Error(`Failed to get idempotency records: ${error.message}`);
    }

    return data as Array<{
      step_id: Domain.StepId;
      result: Record<string, unknown>;
    }>;
  }
}
