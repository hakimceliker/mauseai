import { describe, it, expect, beforeEach } from "vitest";
import {
  Planner,
  DependencyGraph,
  PlanValidator,
  type Plan,
  type PlanConstraints,
} from "../planner/index";
import { TaskStatus, RiskLevel, type TaskType } from "../contracts/index";

describe("Phase B3 - Planner", () => {
  let planner: Planner;
  let validator: PlanValidator;

  beforeEach(() => {
    planner = new Planner();
    validator = new PlanValidator();
  });

  function createTestTask(
    overrides: Partial<TaskType> = {}
  ): TaskType {
    return {
      id: crypto.randomUUID(),
      title: "Test Task",
      goal: "Test goal",
      status: TaskStatus.TODO,
      phaseTarget: "B3",
      assignedAgent: "agent-1",
      estimatedCost: { tokens: 1000, usd: 0.1 },
      actualCost: { tokens: 0, usd: 0 },
      auditTraceId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: [],
      retryCount: 0,
      maxRetries: 3,
      evidence: [],
      humanApprovalRequired: false,
      humanApprovalStatus: "NONE",
      ...overrides,
    };
  }

  // =========================================================================
  // DEPENDENCY GRAPH TESTS
  // =========================================================================

  describe("DependencyGraph", () => {
    it("should create and add tasks to the graph", () => {
      const graph = new DependencyGraph();
      const task = createTestTask();

      graph.addTask(task);
      expect(graph.getSize()).toBe(1);
      expect(graph.getTask(task.id)).toEqual(task);
    });

    it("should throw error when adding duplicate task", () => {
      const graph = new DependencyGraph();
      const task = createTestTask();

      graph.addTask(task);
      expect(() => graph.addTask(task)).toThrow();
    });

    it("should add dependencies between tasks", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addDependency(task2.id, task1.id);

      const deps = graph.getDependencies(task2.id);
      expect(deps).toContain(task1.id);
    });

    it("should detect circular dependencies", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addDependency(task2.id, task1.id);
      graph.addDependency(task1.id, task2.id);

      const cycle = graph.detectCycles();
      expect(cycle).not.toBeNull();
      expect(cycle).toContain(task1.id);
      expect(cycle).toContain(task2.id);
    });

    it("should perform topological sort correctly", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });
      const task3 = createTestTask({
        title: "Task 3",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addTask(task3);
      graph.addDependency(task2.id, task1.id);
      graph.addDependency(task3.id, task2.id);

      const sorted = graph.topologicalSort();
      expect(sorted).toEqual([task1.id, task2.id, task3.id]);
    });

    it("should compute critical path", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });
      const task3 = createTestTask({
        title: "Task 3",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addTask(task3);
      graph.addDependency(task2.id, task1.id);
      graph.addDependency(task3.id, task2.id);

      const path = graph.getCriticalPath();
      expect(path.length).toBe(3);
      expect(path[0]).toBe(task1.id);
    });

    it("should identify ready tasks", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addDependency(task2.id, task1.id);

      const completed = new Set<string>();
      let ready = graph.getReadyTasks(completed);
      expect(ready).toContain(task1.id);
      expect(ready).not.toContain(task2.id);

      completed.add(task1.id);
      ready = graph.getReadyTasks(completed);
      expect(ready).toContain(task2.id);
    });

    it("should identify blocked tasks", () => {
      const graph = new DependencyGraph();
      const task1 = createTestTask({ title: "Task 1" });
      const task2 = createTestTask({
        title: "Task 2",
        id: crypto.randomUUID(),
      });

      graph.addTask(task1);
      graph.addTask(task2);
      graph.addDependency(task2.id, task1.id);

      const completed = new Set<string>();
      const blocked = graph.getBlockedTasks(completed);
      expect(blocked).toContain(task2.id);
    });
  });

  // =========================================================================
  // PLAN VALIDATOR TESTS
  // =========================================================================

  describe("PlanValidator", () => {
    it("should validate plan completeness", () => {
      const task = createTestTask();

      const plan: Plan = {
        id: crypto.randomUUID(),
        goal: "Test goal",
        tasks: [task],
        dependencyGraph: new DependencyGraph(),
        agentAssignments: new Map([[task.id, "agent-1"]]),
        costEstimate: {
          totalTokens: 1000,
          totalUsd: 0.1,
          costPerTask: {},
          contingency: 0.015,
          breakdown: { base: 0.1, contingency: 0.015, total: 0.115 },
        },
        durationEstimate: {
          criticalPathLength: 1,
          estimatedMinutes: 1,
          estimatedSeconds: 60,
          confidenceLevel: "LOW",
          parallelizableTasks: [],
        },
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
        createdBy: "test-agent",
        auditTraceId: crypto.randomUUID(),
      };

      const issues = validator.validateCompleteness(plan);
      expect(issues).toHaveLength(0);
    });

    it("should detect missing dependencies", () => {
      const task = createTestTask({ dependencies: ["missing-task-id"] });

      const plan: Plan = {
        id: crypto.randomUUID(),
        goal: "Test goal",
        tasks: [task],
        dependencyGraph: new DependencyGraph(),
        agentAssignments: new Map([[task.id, "agent-1"]]),
        costEstimate: {
          totalTokens: 1000,
          totalUsd: 0.1,
          costPerTask: {},
          contingency: 0.015,
          breakdown: { base: 0.1, contingency: 0.015, total: 0.115 },
        },
        durationEstimate: {
          criticalPathLength: 1,
          estimatedMinutes: 1,
          estimatedSeconds: 60,
          confidenceLevel: "LOW",
          parallelizableTasks: [],
        },
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
        createdBy: "test-agent",
        auditTraceId: crypto.randomUUID(),
      };

      const issues = validator.validateCompleteness(plan);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain("missing-task-id");
    });

    it("should validate budget constraints", () => {
      const task = createTestTask({
        estimatedCost: { tokens: 1000, usd: 50 },
      });

      const plan: Plan = {
        id: crypto.randomUUID(),
        goal: "Test goal",
        tasks: [task],
        dependencyGraph: new DependencyGraph(),
        agentAssignments: new Map([[task.id, "agent-1"]]),
        costEstimate: {
          totalTokens: 1000,
          totalUsd: 50,
          costPerTask: {},
          contingency: 7.5,
          breakdown: { base: 50, contingency: 7.5, total: 57.5 },
        },
        durationEstimate: {
          criticalPathLength: 1,
          estimatedMinutes: 1,
          estimatedSeconds: 60,
          confidenceLevel: "LOW",
          parallelizableTasks: [],
        },
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
        createdBy: "test-agent",
        auditTraceId: crypto.randomUUID(),
      };

      const isWithinBudget = validator.validateBudget(plan, 100);
      expect(isWithinBudget).toBe(true);

      const isOverBudget = validator.validateBudget(plan, 50);
      expect(isOverBudget).toBe(false);
    });

    it("should identify risky tasks", () => {
      const task = createTestTask({
        title: "Deploy to production",
        goal: "Deploy the application to production",
      });

      const plan: Plan = {
        id: crypto.randomUUID(),
        goal: "Deploy app",
        tasks: [task],
        dependencyGraph: new DependencyGraph(),
        agentAssignments: new Map([[task.id, "agent-1"]]),
        costEstimate: {
          totalTokens: 1000,
          totalUsd: 0.1,
          costPerTask: {},
          contingency: 0.015,
          breakdown: { base: 0.1, contingency: 0.015, total: 0.115 },
        },
        durationEstimate: {
          criticalPathLength: 1,
          estimatedMinutes: 1,
          estimatedSeconds: 60,
          confidenceLevel: "LOW",
          parallelizableTasks: [],
        },
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
        createdBy: "test-agent",
        auditTraceId: crypto.randomUUID(),
      };

      const risk = validator.validateRisk(plan);
      expect(risk.hasRisks).toBe(true);
      expect(risk.riskTasks).toContain(task.id);
    });
  });

  // =========================================================================
  // PLANNER TESTS
  // =========================================================================

  describe("Planner", () => {
    it("should plan a simple goal", async () => {
      const goal = "Implement a simple REST API";
      const constraints: PlanConstraints = {
        budgetLimit: 100,
        maxTasks: 10,
      };

      const plan = await planner.planGoal(goal, constraints);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.goal).toBe(goal);
      expect(plan.tasks).toHaveLength(1); // Single task for simple goal
      expect(plan.createdAt).toBeDefined();
    });

    it("should estimate cost correctly", async () => {
      const goal = "Test goal";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const cost = await planner.estimateCost(plan);

      expect(cost.totalTokens).toBeGreaterThan(0);
      expect(cost.totalUsd).toBeGreaterThan(0);
      expect(cost.breakdown.total).toBeGreaterThan(cost.breakdown.base);
    });

    it("should estimate duration correctly", async () => {
      const goal = "Test goal";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const duration = await planner.estimateDuration(plan);

      expect(duration.estimatedMinutes).toBeGreaterThan(0);
      expect(duration.estimatedSeconds).toBeGreaterThan(0);
    });

    it("should validate plan successfully", async () => {
      const goal = "Test goal";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const validation = await planner.validatePlan(plan);

      expect(validation).toBeDefined();
      expect(validation.completenessOk).toBe(true);
      expect(validation.feasibilityOk).toBe(true);
    });

    it("should identify approval gates for risky tasks", async () => {
      const goal = "Deploy to production and update secrets";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const validation = await planner.validatePlan(plan);

      // Update plan's validation result with the new validation
      plan.validationResult = validation;

      const gates = await planner.identifyApprovalGates(plan);

      expect(gates.length).toBeGreaterThan(0);
      expect(gates[0].requiredFor).toBeDefined();
    });

    it("should generate audit trace", async () => {
      const goal = "Test goal";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);

      expect(plan.auditTraceId).toBeDefined();
      expect(plan.auditTraceId.startsWith("trace-")).toBe(true);
    });
  });

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================

  describe("Integration Tests", () => {
    it("should complete full planning flow: goal -> plan -> validate -> estimate", async () => {
      const goal =
        "Implement authentication and deploy to production";
      const constraints: PlanConstraints = {
        budgetLimit: 100,
        maxTasks: 5,
      };

      // 1. Plan goal
      const plan = await planner.planGoal(goal, constraints);
      expect(plan).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);

      // 2. Validate plan
      const validation = await planner.validatePlan(plan);
      expect(validation).toBeDefined();

      // 3. Estimate cost
      const cost = await planner.estimateCost(plan);
      expect(cost.breakdown.total).toBeLessThanOrEqual(
        constraints.budgetLimit! * 1.5
      );

      // 4. Estimate duration
      const duration = await planner.estimateDuration(plan);
      expect(duration.estimatedMinutes).toBeGreaterThan(0);

      // 5. Identify approval gates
      const gates = await planner.identifyApprovalGates(plan);
      expect(gates).toBeDefined();
    });

    it("should build dependency graph with multiple tasks", async () => {
      const goal = "Build database, create API, deploy";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const graph = plan.dependencyGraph;

      expect(graph.getSize()).toBeGreaterThan(0);

      // Test topological sort
      const sorted = graph.topologicalSort();
      expect(sorted.length).toBeGreaterThan(0);

      // Test cycle detection
      const cycles = graph.detectCycles();
      expect(cycles).toBeNull(); // Should be no cycles
    });

    it("should handle risky tasks with approval requirements", async () => {
      const goal =
        "Delete database records and update payment information";
      const constraints: PlanConstraints = {};

      const plan = await planner.planGoal(goal, constraints);
      const validation = await planner.validatePlan(plan);
      const risk = validation.riskAssessment;

      expect(risk.hasRisks).toBe(true);
      expect(risk.riskTasks.length).toBeGreaterThan(0);
      expect(risk.approvalGatesRequired.length).toBeGreaterThan(0);
    });
  });
});
