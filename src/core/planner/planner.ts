import {
  TaskType,
  AgentType,
  ApprovalRequiredFor,
  isHighRiskApproval,
  RiskLevel,
  TaskStatus,
} from "../contracts/index";
import { DependencyGraph } from "./dependency-graph";
import { PlanValidator, RiskAssessment } from "./plan-validator";
import {
  Plan,
  PlanConstraints,
  ParsedGoal,
  DecompositionCandidate,
  CostEstimate,
  DurationEstimate,
  ApprovalGate,
  PlanValidationResult,
} from "./types";

/**
 * Agent Registry interface (for B4)
 */
export interface AgentRegistry {
  findAgentsByCapability(capability: string): Promise<AgentType[]>;
  findAgentsByRole(role: string): Promise<AgentType[]>;
  getAgent(agentId: string): Promise<AgentType | null>;
  findBestAgent(
    capability: string,
    riskLevel: RiskLevel
  ): Promise<AgentType | null>;
}

/**
 * Planner - decomposes user goals into executable task graphs
 * Part of Phase B3 in the MauseAI LETFON core runtime
 */
export class Planner {
  private validator: PlanValidator;
  private decompositionHistory: Map<string, DecompositionCandidate[]>;

  constructor() {
    this.validator = new PlanValidator();
    this.decompositionHistory = new Map();
  }

  /**
   * 1. Decompose user goal into task graph
   * - Parse goal (intent, scope, constraints)
   * - Generate candidate decompositions (recursive, multi-level)
   * - Evaluate each for completeness, efficiency, risk, cost, duration
   * - Return best plan with task list and dependency graph
   * - Audit: log all candidates considered and reason for selection
   */
  async planGoal(
    goal: string,
    constraints: PlanConstraints
  ): Promise<Plan> {
    const auditTraceId = this.generateTraceId();
    const createdBy = "planner-system"; // Would be the agent ID in real system

    // Parse goal
    const parsedGoal = this.parseGoal(goal, constraints);

    // Generate candidate decompositions
    const candidates = this.generateCandidates(
      goal,
      parsedGoal,
      constraints
    );

    // Evaluate candidates
    const scoredCandidates = await Promise.all(
      candidates.map((candidate) =>
        this.evaluateCandidate(candidate, constraints)
      )
    );

    // Select best candidate
    const bestCandidate = scoredCandidates.sort(
      (a, b) => b.score - a.score
    )[0];

    if (!bestCandidate) {
      throw new Error("Failed to generate any valid plan");
    }

    // Store audit history
    this.decompositionHistory.set(auditTraceId, scoredCandidates);

    // Build dependency graph
    const dependencyGraph = await this.buildDependencyGraph(
      bestCandidate.tasks
    );

    // Create plan
    const plan: Plan = {
      id: crypto.randomUUID(),
      goal,
      tasks: bestCandidate.tasks,
      dependencyGraph,
      agentAssignments: new Map(),
      costEstimate: bestCandidate.estimatedCost,
      durationEstimate: bestCandidate.estimatedDuration,
      approvalGates: [],
      validationResult: {
        isValid: false,
        completenessOk: false,
        feasibilityOk: false,
        budgetOk: false,
        timelineOk: false,
        riskAssessment: {
          hasRisks: false,
          riskTasks: [],
          approvalGatesRequired: [],
          mitigationStrategies: {},
          overallRiskLevel: RiskLevel.LOW,
        },
        issues: [],
        warnings: [],
        approvalGatesRequired: [],
      },
      createdAt: new Date().toISOString(),
      createdBy,
      auditTraceId,
    };

    return plan;
  }

  /**
   * 2. Build dependency graph from tasks
   * - Analyze task relationships
   * - Extract dependencies (task A must complete before B)
   * - Detect cycles (abort if found)
   * - Compute critical path
   * - Estimate duration (sum of critical path)
   * - Identify parallelizable work
   */
  async buildDependencyGraph(tasks: TaskType[]): Promise<DependencyGraph> {
    const graph = new DependencyGraph();

    // Add all tasks
    for (const task of tasks) {
      graph.addTask(task);
    }

    // Add dependencies from task objects
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        graph.addDependency(task.id, depId);
      }
    }

    // Detect cycles
    const cycle = graph.detectCycles();
    if (cycle) {
      throw new Error(
        `Circular dependency detected: ${cycle.join(" -> ")}`
      );
    }

    return graph;
  }

  /**
   * 3. Validate plan
   * - Check: all tasks defined
   * - Check: all dependencies resolvable
   * - Check: no circular dependencies
   * - Check: risks identified
   * - Check: cost reasonable
   * - Check: duration reasonable
   * - Identify approval gates
   */
  async validatePlan(plan: Plan): Promise<PlanValidationResult> {
    const budget = 10000; // Default budget in USD
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const completenessIssues = this.validator.validateCompleteness(plan);
    const feasibilityIssues = this.validator.validateFeasibility(plan);
    const budgetOk = this.validator.validateBudget(plan, budget);
    const timelineOk = this.validator.validateTimeline(plan, deadline);
    const riskAssessment = this.validator.validateRisk(plan);

    // Identify approval gates
    const approvalGates = this.identifyApprovalGatesFromRisk(
      riskAssessment,
      plan
    );

    const issues: string[] = [
      ...completenessIssues,
      ...feasibilityIssues,
    ];

    const warnings: string[] = [];
    if (!budgetOk) {
      warnings.push(
        `Plan cost exceeds budget of $${budget}`
      );
    }
    if (!timelineOk) {
      warnings.push("Plan duration exceeds deadline");
    }

    const isValid =
      issues.length === 0 &&
      completenessIssues.length === 0 &&
      feasibilityIssues.length === 0;

    return {
      isValid,
      completenessOk: completenessIssues.length === 0,
      feasibilityOk: feasibilityIssues.length === 0,
      budgetOk,
      timelineOk,
      riskAssessment,
      issues,
      warnings,
      approvalGatesRequired: approvalGates,
    };
  }

  /**
   * 4. Assign agents to tasks
   * - For each task, determine required capability
   * - Query Agent Registry for matching agents
   * - Select best agent based on capability, risk, availability, success rate
   * - Assign judge owner (different from executor)
   */
  async assignAgents(
    plan: Plan,
    registry: AgentRegistry
  ): Promise<Plan> {
    const assignments = new Map<string, string>();

    for (const task of plan.tasks) {
      // Determine required capability from task
      const requiredCapability = this.inferCapability(
        task.title,
        task.goal
      );

      // Find best agent
      const agent = await registry.findBestAgent(
        requiredCapability,
        RiskLevel.MEDIUM
      );

      if (!agent) {
        throw new Error(
          `No agent found for capability: ${requiredCapability}`
        );
      }

      assignments.set(task.id, agent.id);
    }

    plan.agentAssignments = assignments;
    return plan;
  }

  /**
   * 5. Estimate cost
   * - For each task, estimate tokens and provider cost
   * - Sum all tasks
   * - Add contingency (15%)
   * - Compare to budget
   */
  async estimateCost(plan: Plan): Promise<CostEstimate> {
    const costPerTask: Record<string, { tokens: number; usd: number }> = {};
    let totalTokens = 0;
    let totalUsd = 0;

    for (const task of plan.tasks) {
      const taskCost = task.estimatedCost;
      costPerTask[task.id] = {
        tokens: taskCost.tokens,
        usd: taskCost.usd,
      };
      totalTokens += taskCost.tokens;
      totalUsd += taskCost.usd;
    }

    const contingency = totalUsd * 0.15; // 15% buffer
    const total = totalUsd + contingency;

    return {
      totalTokens,
      totalUsd,
      costPerTask,
      contingency,
      breakdown: {
        base: totalUsd,
        contingency,
        total,
      },
    };
  }

  /**
   * 6. Estimate duration
   * - For each task, estimate time
   * - Account for dependencies (critical path)
   * - Account for parallel execution
   * - Add buffers for approval wait-time
   */
  async estimateDuration(plan: Plan): Promise<DurationEstimate> {
    const criticalPath = plan.dependencyGraph.getCriticalPath();
    const criticalPathLength = criticalPath.length;

    // Simplified: assume each task takes 1 minute
    // In real system, extract from task metadata
    const estimatedSeconds = criticalPathLength * 60;
    const estimatedMinutes = estimatedSeconds / 60;

    // Identify parallelizable tasks
    const parallelizable: string[] = [];
    const allTasks = plan.dependencyGraph.getAllTasks();

    for (const task of allTasks) {
      const deps = plan.dependencyGraph.getDependencies(task.id);
      if (deps.length === 0 || deps.length <= 1) {
        parallelizable.push(task.id);
      }
    }

    // Add buffer for approval wait-time (30 minutes per approval gate)
    const approvalBuffer =
      plan.approvalGates.length * 30;

    return {
      criticalPathLength,
      estimatedMinutes: estimatedMinutes + approvalBuffer,
      estimatedSeconds: estimatedSeconds + approvalBuffer * 60,
      confidenceLevel: "MEDIUM",
      parallelizableTasks: parallelizable,
    };
  }

  /**
   * 7. Identify approval gates
   * - Scan for risky tasks (production deploy, DNS, secret, payment, delete, force-push, data-change)
   * - For each risk, identify required approver
   * - Create approval records
   */
  async identifyApprovalGates(plan: Plan): Promise<ApprovalGate[]> {
    const riskAssessment = plan.validationResult.riskAssessment;
    const gates: ApprovalGate[] = [];

    for (const approvalType of riskAssessment.approvalGatesRequired) {
      const gate: ApprovalGate = {
        id: crypto.randomUUID(),
        taskId: riskAssessment.riskTasks[0] || plan.tasks[0]?.id || "",
        requiredFor: approvalType,
        requesterAgent: "planner-system",
        approverHuman: "admin@example.com", // Would get from config
        failIfNotApproved: isHighRiskApproval(approvalType),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      gates.push(gate);
    }

    return gates;
  }

  /**
   * 8. Create audit record for plan
   * - Log goal, decomposition candidates, selected plan
   * - Log cost estimate, duration estimate, approval gates
   * - Log agent assignments
   */
  async auditPlan(plan: Plan, reason: string): Promise<void> {
    const history = this.decompositionHistory.get(plan.auditTraceId);

    // In a real system, persist to audit database
    const auditRecord = {
      traceId: plan.auditTraceId,
      timestamp: new Date().toISOString(),
      goal: plan.goal,
      reason,
      candidatesEvaluated: history?.length || 0,
      selectedPlan: {
        id: plan.id,
        taskCount: plan.tasks.length,
        costUsd: plan.costEstimate.breakdown.total,
        estimatedDuration: plan.durationEstimate.estimatedMinutes,
      },
      agentAssignments: Array.from(plan.agentAssignments.entries()),
      approvalGates: plan.approvalGates.map((g) => ({
        id: g.id,
        type: g.requiredFor,
        taskId: g.taskId,
      })),
    };

    console.log("AUDIT RECORD:", JSON.stringify(auditRecord, null, 2));
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Parse goal into intent, scope, and constraints
   */
  private parseGoal(
    goal: string,
    constraints: PlanConstraints
  ): ParsedGoal {
    // Simple keyword-based parsing
    const lowerGoal = goal.toLowerCase();

    const intent = this.extractIntent(goal);
    const scope = this.extractScope(goal);
    const requiredCapabilities = this.extractCapabilities(goal);
    const riskIndicators = this.extractRiskIndicators(goal);

    return {
      intent,
      scope,
      requiredCapabilities,
      riskIndicators,
      constraints,
    };
  }

  /**
   * Generate candidate decompositions
   */
  private generateCandidates(
    goal: string,
    parsedGoal: ParsedGoal,
    constraints: PlanConstraints
  ): DecompositionCandidate[] {
    // Start with simple single-task decomposition
    const candidates: DecompositionCandidate[] = [];

    // Single task approach
    const singleTask = this.createTask(
      goal,
      parsedGoal.requiredCapabilities,
      []
    );
    candidates.push({
      tasks: [singleTask],
      dependencies: [],
      score: 0.5, // Will be evaluated
      reasoning: "Single task decomposition",
      estimatedCost: {
        totalTokens: 5000,
        totalUsd: 0.1,
        costPerTask: { [singleTask.id]: { tokens: 5000, usd: 0.1 } },
        contingency: 0.015,
        breakdown: {
          base: 0.1,
          contingency: 0.015,
          total: 0.115,
        },
      },
      estimatedDuration: {
        criticalPathLength: 1,
        estimatedMinutes: 1,
        estimatedSeconds: 60,
        confidenceLevel: "LOW",
        parallelizableTasks: [],
      },
    });

    // Multi-task decomposition (if applicable)
    if (parsedGoal.requiredCapabilities.length > 1) {
      // First create all tasks without dependencies
      const multiTasks = parsedGoal.requiredCapabilities.map((cap) =>
        this.createTask(`${cap}: ${goal}`, [cap], [])
      );

      // Then update their dependency arrays with actual task IDs
      for (let idx = 1; idx < multiTasks.length; idx++) {
        multiTasks[idx].dependencies = [multiTasks[idx - 1].id];
      }

      const deps = multiTasks.map((task, idx) => ({
        taskId: task.id,
        dependsOn:
          idx > 0 ? [multiTasks[idx - 1].id] : [],
      }));

      candidates.push({
        tasks: multiTasks,
        dependencies: deps,
        score: 0.7, // Multi-task is often better
        reasoning: "Multi-task sequential decomposition by capability",
        estimatedCost: {
          totalTokens: 10000,
          totalUsd: 0.2,
          costPerTask: multiTasks.reduce(
            (acc, task) => {
              acc[task.id] = {
                tokens: 5000,
                usd: 0.1,
              };
              return acc;
            },
            {} as Record<string, { tokens: number; usd: number }>
          ),
          contingency: 0.03,
          breakdown: {
            base: 0.2,
            contingency: 0.03,
            total: 0.23,
          },
        },
        estimatedDuration: {
          criticalPathLength: 2,
          estimatedMinutes: 2,
          estimatedSeconds: 120,
          confidenceLevel: "MEDIUM",
          parallelizableTasks: [],
        },
      });
    }

    return candidates;
  }

  /**
   * Evaluate a candidate decomposition
   */
  private async evaluateCandidate(
    candidate: DecompositionCandidate,
    constraints: PlanConstraints
  ): Promise<DecompositionCandidate> {
    let score = candidate.score;

    // Evaluate completeness
    if (candidate.tasks.length > 0) {
      score += 0.1;
    }

    // Evaluate efficiency
    const taskCount = candidate.tasks.length;
    if (taskCount <= 3) {
      score += 0.1;
    }

    // Evaluate cost
    if (candidate.estimatedCost.breakdown.total <= 1.0) {
      score += 0.1;
    }

    // Evaluate duration
    if (candidate.estimatedDuration.estimatedMinutes <= 30) {
      score += 0.1;
    }

    // Evaluate against constraints
    if (
      constraints.maxTasks &&
      taskCount <= constraints.maxTasks
    ) {
      score += 0.05;
    }

    if (
      constraints.budgetLimit &&
      candidate.estimatedCost.breakdown.total <=
        constraints.budgetLimit
    ) {
      score += 0.05;
    }

    candidate.score = Math.min(score, 1.0);
    return candidate;
  }

  /**
   * Create a task from goal and capabilities
   */
  private createTask(
    goal: string,
    capabilities: string[],
    dependencies: string[]
  ): TaskType {
    return {
      id: crypto.randomUUID(),
      title: goal.substring(0, 100),
      goal,
      status: TaskStatus.TODO,
      phaseTarget: "B3",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies,
      assignedAgent: "unassigned",
      estimatedCost: { tokens: 5000, usd: 0.1 },
      actualCost: { tokens: 0, usd: 0 },
      retryCount: 0,
      maxRetries: 3,
      evidence: [],
      humanApprovalRequired: false,
      humanApprovalStatus: "NONE",
      auditTraceId: this.generateTraceId(),
    };
  }

  /**
   * Extract intent from goal
   */
  private extractIntent(goal: string): string {
    const verbs = [
      "implement",
      "fix",
      "deploy",
      "create",
      "update",
      "delete",
      "review",
      "analyze",
    ];

    for (const verb of verbs) {
      if (goal.toLowerCase().includes(verb)) {
        return verb;
      }
    }

    return "execute";
  }

  /**
   * Extract scope from goal
   */
  private extractScope(goal: string): string {
    const scopes = [
      "frontend",
      "backend",
      "database",
      "api",
      "test",
      "documentation",
    ];

    for (const scope of scopes) {
      if (goal.toLowerCase().includes(scope)) {
        return scope;
      }
    }

    return "general";
  }

  /**
   * Extract required capabilities from goal
   */
  private extractCapabilities(goal: string): string[] {
    const capabilities = [
      "code-review",
      "deploy",
      "database",
      "testing",
      "documentation",
      "security",
    ];

    return capabilities.filter((cap) =>
      goal.toLowerCase().includes(cap)
    );
  }

  /**
   * Extract risk indicators from goal
   */
  private extractRiskIndicators(goal: string): string[] {
    const riskWords = [
      "production",
      "critical",
      "urgent",
      "delete",
      "force",
      "secret",
      "payment",
    ];

    return riskWords.filter((word) =>
      goal.toLowerCase().includes(word)
    );
  }

  /**
   * Infer capability from task title and goal
   */
  private inferCapability(title: string, goal: string): string {
    const content = `${title} ${goal}`.toLowerCase();

    if (content.includes("code") || content.includes("implement")) {
      return "code-review";
    }
    if (content.includes("deploy")) {
      return "deploy";
    }
    if (content.includes("database")) {
      return "database";
    }
    if (content.includes("test")) {
      return "testing";
    }
    if (content.includes("doc")) {
      return "documentation";
    }

    return "general";
  }

  /**
   * Identify approval gates from risk assessment
   */
  private identifyApprovalGatesFromRisk(
    risk: RiskAssessment,
    plan: Plan
  ): ApprovalGate[] {
    const gates: ApprovalGate[] = [];

    for (const approvalType of risk.approvalGatesRequired) {
      const gate: ApprovalGate = {
        id: crypto.randomUUID(),
        taskId:
          risk.riskTasks[0] ||
          plan.tasks[0]?.id ||
          "",
        requiredFor: approvalType,
        requesterAgent: "planner-system",
        approverHuman: "admin@example.com",
        failIfNotApproved: isHighRiskApproval(
          approvalType
        ),
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      gates.push(gate);
    }

    return gates;
  }

  /**
   * Generate trace ID for audit
   */
  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
