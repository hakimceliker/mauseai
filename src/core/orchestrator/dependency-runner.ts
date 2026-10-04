import { TaskStatus, type TaskType } from "@/src/core/contracts";

/**
 * Result of executing a dependency graph
 */
export interface GraphExecutionResult {
  success: boolean;
  taskResults: Map<string, TaskExecutionNodeResult>;
  totalTasksExecuted: number;
  failedTasks: string[];
  allEvidence: Array<unknown>;
  allReviews: Array<unknown>;
  allJudgments: Array<unknown>;
  executionOrder: string[];
  cycles?: string[];
}

/**
 * Result for a single node in the dependency graph
 */
export interface TaskExecutionNodeResult {
  taskId: string;
  status: TaskStatus;
  output?: unknown;
  error?: string;
  evidenceCount: number;
  reviewCount: number;
  judgmentCount: number;
}

/**
 * DependencyRunner executes task graphs in correct topological order.
 * Ensures tasks are executed only after their dependencies are satisfied.
 */
export class DependencyRunner {
  /**
   * Execute a graph of tasks respecting dependency order
   */
  async runDependencyGraph(
    tasks: TaskType[],
    executorFn: (
      task: TaskType
    ) => Promise<{
      status: TaskStatus;
      output?: unknown;
      error?: string;
      evidence: Array<unknown>;
      reviews: Array<unknown>;
      judgments: Array<unknown>;
    }>,
    options: {
      continueOnFailure?: boolean;
      rollbackOnFailure?: boolean;
    } = {}
  ): Promise<GraphExecutionResult> {
    const { continueOnFailure = false, rollbackOnFailure = false } = options;

    // Build dependency map
    const taskMap = new Map<string, TaskType>(tasks.map((t) => [t.id, t]));

    // Detect cycles
    const cycles = this.detectCycles(taskMap);
    if (cycles.length > 0) {
      return {
        success: false,
        taskResults: new Map(),
        totalTasksExecuted: 0,
        failedTasks: [],
        allEvidence: [],
        allReviews: [],
        allJudgments: [],
        executionOrder: [],
        cycles,
      };
    }

    // Topological sort
    const executionOrder = this.topologicalSort(taskMap);

    // Execute tasks in order
    const taskResults = new Map<string, TaskExecutionNodeResult>();
    const failedTasks: string[] = [];
    const allEvidence: Array<unknown> = [];
    const allReviews: Array<unknown> = [];
    const allJudgments: Array<unknown> = [];
    const executedTasks: Set<string> = new Set();

    for (const taskId of executionOrder) {
      const task = taskMap.get(taskId);
      if (!task) {
        continue;
      }

      // Check if dependencies are met
      const dependenciesMet = this.areDependenciesMet(task, executedTasks);
      if (!dependenciesMet) {
        taskResults.set(taskId, {
          taskId,
          status: TaskStatus.BLOCKED,
          error: "Dependencies not met",
          evidenceCount: 0,
          reviewCount: 0,
          judgmentCount: 0,
        });
        failedTasks.push(taskId);

        if (!continueOnFailure) {
          return {
            success: false,
            taskResults,
            totalTasksExecuted: executedTasks.size,
            failedTasks,
            allEvidence,
            allReviews,
            allJudgments,
            executionOrder,
          };
        }
        continue;
      }

      // Execute task
      try {
        const result = await executorFn(task);

        taskResults.set(taskId, {
          taskId,
          status: result.status,
          output: result.output,
          evidenceCount: result.evidence.length,
          reviewCount: result.reviews.length,
          judgmentCount: result.judgments.length,
        });

        // Collect evidence from result
        allEvidence.push(...result.evidence);
        allReviews.push(...result.reviews);
        allJudgments.push(...result.judgments);

        if (result.status !== TaskStatus.CLOSED) {
          failedTasks.push(taskId);
          if (!continueOnFailure) {
            if (rollbackOnFailure) {
              // Rollback all executed tasks (would be implemented)
              return {
                success: false,
                taskResults,
                totalTasksExecuted: executedTasks.size,
                failedTasks,
                allEvidence,
                allReviews,
                allJudgments,
                executionOrder,
              };
            }
            return {
              success: false,
              taskResults,
              totalTasksExecuted: executedTasks.size,
              failedTasks,
              allEvidence,
              allReviews,
              allJudgments,
              executionOrder,
            };
          }
        }

        executedTasks.add(taskId);
      } catch (error) {
        taskResults.set(taskId, {
          taskId,
          status: TaskStatus.BLOCKED,
          error: error instanceof Error ? error.message : String(error),
          evidenceCount: 0,
          reviewCount: 0,
          judgmentCount: 0,
        });

        failedTasks.push(taskId);

        if (!continueOnFailure) {
          return {
            success: false,
            taskResults,
            totalTasksExecuted: executedTasks.size,
            failedTasks,
            allEvidence,
            allReviews,
            allJudgments,
            executionOrder,
          };
        }
      }
    }

    return {
      success: failedTasks.length === 0,
      taskResults,
      totalTasksExecuted: executedTasks.size,
      failedTasks,
      allEvidence,
      allReviews,
      allJudgments,
      executionOrder,
    };
  }

  /**
   * Detect cycles in the dependency graph using DFS
   */
  private detectCycles(taskMap: Map<string, TaskType>): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[] = [];

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.dependencies) {
        recursionStack.delete(taskId);
        return false;
      }

      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycle(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          cycles.push(`${taskId} -> ${depId}`);
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of taskMap.keys()) {
      if (!visited.has(taskId)) {
        hasCycle(taskId);
      }
    }

    return cycles;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(taskMap: Map<string, TaskType>): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize
    for (const [taskId, task] of taskMap) {
      inDegree.set(taskId, task.dependencies?.length || 0);
      if (!adjacency.has(taskId)) {
        adjacency.set(taskId, []);
      }

      for (const depId of task.dependencies || []) {
        if (!adjacency.has(depId)) {
          adjacency.set(depId, []);
        }
        adjacency.get(depId)!.push(taskId);
      }
    }

    // Find nodes with no incoming edges
    const queue: string[] = [];
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of adjacency.get(current) || []) {
        const currentDegree = inDegree.get(neighbor) || 0;
        inDegree.set(neighbor, currentDegree - 1);
        if (currentDegree - 1 === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Check if all dependencies of a task have been executed
   */
  private areDependenciesMet(
    task: TaskType,
    executedTasks: Set<string>
  ): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every((depId) => executedTasks.has(depId));
  }
}
