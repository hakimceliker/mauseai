import { TaskType } from "../contracts/index";

/**
 * Represents a directed acyclic graph (DAG) of task dependencies
 * Used to determine execution order and parallelizable work
 */
export class DependencyGraph {
  private tasks: Map<string, TaskType>;
  private edges: Map<string, Set<string>>; // taskId → Set of dependent taskIds
  private reverseEdges: Map<string, Set<string>>; // taskId → Set of taskIds that depend on this one

  constructor() {
    this.tasks = new Map();
    this.edges = new Map();
    this.reverseEdges = new Map();
  }

  /**
   * Add a task to the graph
   */
  addTask(task: TaskType): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} already exists in graph`);
    }
    this.tasks.set(task.id, task);
    if (!this.edges.has(task.id)) {
      this.edges.set(task.id, new Set());
    }
    if (!this.reverseEdges.has(task.id)) {
      this.reverseEdges.set(task.id, new Set());
    }
  }

  /**
   * Add a dependency: taskId depends on dependsOnTaskId
   * This means dependsOnTaskId must complete before taskId can start
   */
  addDependency(taskId: string, dependsOnTaskId: string): void {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task ${taskId} not found in graph`);
    }
    if (!this.tasks.has(dependsOnTaskId)) {
      throw new Error(`Task ${dependsOnTaskId} not found in graph`);
    }

    // Forward edge: dependsOnTaskId -> taskId
    if (!this.edges.has(dependsOnTaskId)) {
      this.edges.set(dependsOnTaskId, new Set());
    }
    this.edges.get(dependsOnTaskId)!.add(taskId);

    // Reverse edge: taskId -> dependsOnTaskId
    if (!this.reverseEdges.has(taskId)) {
      this.reverseEdges.set(taskId, new Set());
    }
    this.reverseEdges.get(taskId)!.add(dependsOnTaskId);
  }

  /**
   * Detect if there are circular dependencies
   * Returns the cycle path if found, null otherwise
   */
  detectCycles(): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        const cycle = this.detectCyclesDFS(
          taskId,
          visited,
          recursionStack,
          new Map()
        );
        if (cycle) {
          return cycle;
        }
      }
    }

    return null;
  }

  private detectCyclesDFS(
    taskId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    parent: Map<string, string>
  ): string[] | null {
    visited.add(taskId);
    recursionStack.add(taskId);

    const dependents = this.edges.get(taskId) || new Set();
    for (const dependent of dependents) {
      if (!visited.has(dependent)) {
        parent.set(dependent, taskId);
        const cycle = this.detectCyclesDFS(
          dependent,
          visited,
          recursionStack,
          parent
        );
        if (cycle) {
          return cycle;
        }
      } else if (recursionStack.has(dependent)) {
        // Found a cycle, reconstruct the path
        const cyclePath: string[] = [dependent];
        let current = taskId;
        while (current !== dependent) {
          cyclePath.unshift(current);
          current = parent.get(current)!;
        }
        cyclePath.push(dependent); // close the cycle
        return cyclePath;
      }
    }

    recursionStack.delete(taskId);
    return null;
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns tasks in execution order
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Initialize in-degree for all tasks
    for (const taskId of this.tasks.keys()) {
      const dependencies = this.reverseEdges.get(taskId) || new Set();
      inDegree.set(taskId, dependencies.size);
    }

    // Find all nodes with in-degree 0
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      sorted.push(taskId);

      // For each dependent task
      const dependents = this.edges.get(taskId) || new Set();
      for (const dependent of dependents) {
        const currentDegree = inDegree.get(dependent) || 0;
        inDegree.set(dependent, currentDegree - 1);

        if (inDegree.get(dependent) === 0) {
          queue.push(dependent);
        }
      }
    }

    if (sorted.length !== this.tasks.size) {
      throw new Error(
        "Topological sort failed: graph contains a cycle or is invalid"
      );
    }

    return sorted;
  }

  /**
   * Get the critical path (longest dependency chain)
   * This determines the minimum duration of the plan
   */
  getCriticalPath(): string[] {
    if (this.tasks.size === 0) {
      return [];
    }

    // Compute longest path from each node
    const longestPaths = new Map<string, string[]>();
    const visited = new Set<string>();
    let maxPath: string[] = [];

    const dfs = (taskId: string): string[] => {
      if (longestPaths.has(taskId)) {
        return longestPaths.get(taskId)!;
      }

      const dependents = this.edges.get(taskId) || new Set();
      let longestDependent: string[] = [];

      for (const dependent of dependents) {
        const path = dfs(dependent);
        if (path.length > longestDependent.length) {
          longestDependent = path;
        }
      }

      const path = [taskId, ...longestDependent];
      longestPaths.set(taskId, path);
      return path;
    };

    // Find path starting from nodes with no dependencies
    for (const taskId of this.tasks.keys()) {
      const dependencies = this.reverseEdges.get(taskId) || new Set();
      if (dependencies.size === 0) {
        const path = dfs(taskId);
        if (path.length > maxPath.length) {
          maxPath = path;
        }
      }
    }

    return maxPath;
  }

  /**
   * Check if all required tasks have been completed
   */
  isComplete(completedTasks: Set<string>): boolean {
    return completedTasks.size === this.tasks.size;
  }

  /**
   * Get tasks that cannot start yet (waiting on dependencies)
   */
  getBlockedTasks(completedTasks: Set<string>): string[] {
    const blocked: string[] = [];

    for (const taskId of this.tasks.keys()) {
      if (completedTasks.has(taskId)) {
        continue; // already completed
      }

      const dependencies = this.reverseEdges.get(taskId) || new Set();
      for (const dep of dependencies) {
        if (!completedTasks.has(dep)) {
          blocked.push(taskId);
          break;
        }
      }
    }

    return blocked;
  }

  /**
   * Get tasks that can be executed now (all dependencies completed)
   */
  getReadyTasks(completedTasks: Set<string>): string[] {
    const ready: string[] = [];

    for (const taskId of this.tasks.keys()) {
      if (completedTasks.has(taskId)) {
        continue; // already completed
      }

      const dependencies = this.reverseEdges.get(taskId) || new Set();
      let allDependenciesMet = true;

      for (const dep of dependencies) {
        if (!completedTasks.has(dep)) {
          allDependenciesMet = false;
          break;
        }
      }

      if (allDependenciesMet) {
        ready.push(taskId);
      }
    }

    return ready;
  }

  /**
   * Get the task object by ID
   */
  getTask(taskId: string): TaskType | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): TaskType[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get dependencies of a task (tasks it depends on)
   */
  getDependencies(taskId: string): string[] {
    return Array.from(this.reverseEdges.get(taskId) || new Set());
  }

  /**
   * Get dependents of a task (tasks that depend on it)
   */
  getDependents(taskId: string): string[] {
    return Array.from(this.edges.get(taskId) || new Set());
  }

  /**
   * Get the size of the graph
   */
  getSize(): number {
    return this.tasks.size;
  }
}
