import { TaskType, TaskStatus } from "@/src/core/contracts";

/**
 * TaskStore Interface - Abstraction for task persistence
 * Can be implemented with database, filesystem, or in-memory storage
 */
export interface ITaskStore {
  /**
   * Save a new task or update existing task
   */
  saveTask(task: TaskType): Promise<void>;

  /**
   * Load task by ID
   */
  loadTask(taskId: string): Promise<TaskType | null>;

  /**
   * Update specific fields of a task
   */
  updateTask(taskId: string, updates: Partial<TaskType>): Promise<void>;

  /**
   * List tasks with optional filtering
   */
  listTasks(filter?: TaskFilterOptions): Promise<TaskType[]>;

  /**
   * Delete task (only for cleanup, not normal operation)
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Check if task exists
   */
  taskExists(taskId: string): Promise<boolean>;
}

export interface TaskFilterOptions {
  status?: TaskStatus;
  phaseTarget?: string;
  assignedAgent?: string;
  createdAfter?: Date;
  blockerReason?: string;
  limit?: number;
  offset?: number;
}

/**
 * In-Memory Task Store Implementation
 * Suitable for testing and development
 * For production, implement with database storage
 */
export class InMemoryTaskStore implements ITaskStore {
  private tasks: Map<string, TaskType> = new Map();

  async saveTask(task: TaskType): Promise<void> {
    this.tasks.set(task.id, { ...task });
  }

  async loadTask(taskId: string): Promise<TaskType | null> {
    const task = this.tasks.get(taskId);
    return task ? { ...task } : null;
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskType>
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    this.tasks.set(taskId, { ...task, ...updates });
  }

  async listTasks(filter?: TaskFilterOptions): Promise<TaskType[]> {
    let results = Array.from(this.tasks.values());

    // Apply filters
    if (filter) {
      if (filter.status) {
        results = results.filter((t) => t.status === filter.status);
      }
      if (filter.phaseTarget) {
        results = results.filter((t) => t.phaseTarget === filter.phaseTarget);
      }
      if (filter.assignedAgent) {
        results = results.filter((t) => t.assignedAgent === filter.assignedAgent);
      }
      if (filter.createdAfter) {
        const createdAfter = new Date(filter.createdAfter).getTime();
        results = results.filter(
          (t) => new Date(t.createdAt).getTime() >= createdAfter
        );
      }
      if (filter.blockerReason) {
        results = results.filter((t) => t.blockerReason === filter.blockerReason);
      }
    }

    // Apply pagination
    if (filter?.offset) {
      results = results.slice(filter.offset);
    }
    if (filter?.limit) {
      results = results.slice(0, filter.limit);
    }

    return results.map((t) => ({ ...t }));
  }

  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async taskExists(taskId: string): Promise<boolean> {
    return this.tasks.has(taskId);
  }

  /**
   * Clear all tasks (utility for testing)
   */
  async clear(): Promise<void> {
    this.tasks.clear();
  }

  /**
   * Get total count of tasks (utility for testing)
   */
  async count(): Promise<number> {
    return this.tasks.size;
  }
}

/**
 * Supabase/PostgreSQL Task Store Implementation
 * Placeholder for database implementation
 * In production, this would use actual database queries
 */
export class PostgresTaskStore implements ITaskStore {
  constructor(private supabaseClient: any) {}

  async saveTask(task: TaskType): Promise<void> {
    const { error } = await this.supabaseClient
      .from("tasks")
      .upsert([
        {
          id: task.id,
          title: task.title,
          goal: task.goal,
          status: task.status,
          phase_target: task.phaseTarget,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
          closed_at: task.closedAt,
          dependencies: task.dependencies,
          assigned_agent: task.assignedAgent,
          estimated_cost: task.estimatedCost,
          actual_cost: task.actualCost,
          retry_count: task.retryCount,
          max_retries: task.maxRetries,
          evidence: task.evidence,
          review: task.review,
          judge: task.judge,
          human_approval_required: task.humanApprovalRequired,
          human_approval_status: task.humanApprovalStatus,
          blocker_reason: task.blockerReason,
          output: task.output,
          audit_trace_id: task.auditTraceId,
        },
      ])
      .select();

    if (error) {
      throw new Error(`Failed to save task: ${error.message}`);
    }
  }

  async loadTask(taskId: string): Promise<TaskType | null> {
    const { data, error } = await this.supabaseClient
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to load task: ${error.message}`);
    }

    return this.mapRowToTask(data);
  }

  async updateTask(
    taskId: string,
    updates: Partial<TaskType>
  ): Promise<void> {
    const mappedUpdates = this.mapTaskToRow(updates);

    const { error } = await this.supabaseClient
      .from("tasks")
      .update(mappedUpdates)
      .eq("id", taskId);

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  async listTasks(filter?: TaskFilterOptions): Promise<TaskType[]> {
    let query = this.supabaseClient.from("tasks").select("*");

    if (filter) {
      if (filter.status) {
        query = query.eq("status", filter.status);
      }
      if (filter.phaseTarget) {
        query = query.eq("phase_target", filter.phaseTarget);
      }
      if (filter.assignedAgent) {
        query = query.eq("assigned_agent", filter.assignedAgent);
      }
      if (filter.createdAfter) {
        query = query.gte("created_at", filter.createdAfter.toISOString());
      }
      if (filter.blockerReason) {
        query = query.eq("blocker_reason", filter.blockerReason);
      }
    }

    // Apply ordering and pagination
    query = query.order("created_at", { ascending: false });

    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 100) - 1);
    } else if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list tasks: ${error.message}`);
    }

    return (data || []).map((row: Record<string, unknown>) => this.mapRowToTask(row));
  }

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  async taskExists(taskId: string): Promise<boolean> {
    const { data, error } = await this.supabaseClient
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`Failed to check task existence: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Map database row to TaskType
   */
  private mapRowToTask(row: any): TaskType {
    return {
      id: row.id as string,
      title: row.title as string,
      goal: row.goal as string,
      status: row.status as TaskStatus,
      phaseTarget: row.phase_target as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      closedAt: row.closed_at as string | undefined,
      dependencies: (row.dependencies || []) as string[],
      assignedAgent: row.assigned_agent as string,
      estimatedCost: row.estimated_cost as { tokens: number; usd: number },
      actualCost: row.actual_cost as { tokens: number; usd: number },
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
      evidence: (row.evidence || []) as string[],
      review: row.review as any,
      judge: row.judge as any,
      humanApprovalRequired: row.human_approval_required as boolean,
      humanApprovalStatus: row.human_approval_status as TaskType["humanApprovalStatus"],
      blockerReason: row.blocker_reason as string | undefined,
      output: row.output as unknown,
      auditTraceId: row.audit_trace_id as string,
    };
  }

  /**
   * Map TaskType to database row format
   */
  private mapTaskToRow(task: Partial<TaskType>): Record<string, unknown> {
    const row: any = {};
    if (task.title !== undefined) row.title = task.title;
    if (task.goal !== undefined) row.goal = task.goal;
    if (task.status !== undefined) row.status = task.status;
    if (task.phaseTarget !== undefined) row.phase_target = task.phaseTarget;
    if (task.updatedAt !== undefined) row.updated_at = task.updatedAt;
    if (task.closedAt !== undefined) row.closed_at = task.closedAt;
    if (task.dependencies !== undefined) row.dependencies = task.dependencies;
    if (task.assignedAgent !== undefined) row.assigned_agent = task.assignedAgent;
    if (task.actualCost !== undefined) row.actual_cost = task.actualCost;
    if (task.retryCount !== undefined) row.retry_count = task.retryCount;
    if (task.evidence !== undefined) row.evidence = task.evidence;
    if (task.review !== undefined) row.review = task.review;
    if (task.judge !== undefined) row.judge = task.judge;
    if (task.humanApprovalStatus !== undefined)
      row.human_approval_status = task.humanApprovalStatus;
    if (task.blockerReason !== undefined) row.blocker_reason = task.blockerReason;
    if (task.output !== undefined) row.output = task.output;
    return row;
  }
}
