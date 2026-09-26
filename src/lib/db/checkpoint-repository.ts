import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from './supabase';

export class CheckpointRepository {
  /**
   * Save a checkpoint for task resumption
   */
  static async saveCheckpoint(
    taskId: Domain.TaskId,
    stepId: Domain.StepId,
    state: Record<string, unknown>
  ): Promise<Domain.Checkpoint> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('checkpoints')
      .insert({
        task_id: taskId,
        step_id: stepId,
        state,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save checkpoint: ${error.message}`);
    }

    return this.formatCheckpoint(data);
  }

  /**
   * Get the latest checkpoint for a task step
   */
  static async getLatestCheckpoint(
    taskId: Domain.TaskId,
    stepId?: Domain.StepId
  ): Promise<Domain.Checkpoint | null> {
    const db = getSupabaseAdmin();

    let query = db
      .from('checkpoints')
      .select()
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (stepId) {
      query = query.eq('step_id', stepId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get checkpoint: ${error.message}`);
    }

    return data ? this.formatCheckpoint(data) : null;
  }

  /**
   * Get all checkpoints for a task
   */
  static async getTaskCheckpoints(taskId: Domain.TaskId): Promise<Domain.Checkpoint[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('checkpoints')
      .select()
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get task checkpoints: ${error.message}`);
    }

    return data.map(cp => this.formatCheckpoint(cp));
  }

  /**
   * Format database checkpoint to domain model
   */
  private static formatCheckpoint(data: Record<string, unknown>): Domain.Checkpoint {
    return {
      id: data.id as Domain.CheckpointId,
      task_id: data.task_id as Domain.TaskId,
      step_id: data.step_id as Domain.StepId,
      state: data.state as Record<string, unknown>,
      created_at: new Date(data.created_at as string),
    };
  }
}
