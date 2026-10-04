import { describe, it, expect, beforeEach } from "vitest";
import { MasterOrchestrator } from "@/src/core/orchestrator/master-orchestrator";
import { ExecutionContext, type SimpleCost } from "@/src/core/orchestrator/execution-context";
import { DependencyRunner } from "@/src/core/orchestrator/dependency-runner";
import {
  TaskStatus,
  createTask,
  type TaskType,
  JudgeVerdict,
  ApprovalStatus,
  EvidenceType,
} from "@/src/core/contracts";

describe("Orchestrator", () => {
  let orchestrator: MasterOrchestrator;

  beforeEach(() => {
    orchestrator = new MasterOrchestrator();
  });

  describe("ExecutionContext", () => {
    let context: ExecutionContext;
    const taskId = crypto.randomUUID();
    const agentId = "agent-1";
    const estimatedCost: SimpleCost = { tokens: 1000, usd: 0.1 };

    beforeEach(() => {
      context = new ExecutionContext(
        taskId,
        agentId,
        estimatedCost,
        "INIT"
      );
    });

    it("should initialize with correct default values", () => {
      expect(context.taskId).toBe(taskId);
      expect(context.agentId).toBe(agentId);
      expect(context.state).toBe(TaskStatus.TODO);
      expect(context.evidence.length).toBe(0);
      expect(context.reviews.length).toBe(0);
      expect(context.judgments.length).toBe(0);
      expect(context.actualCost.tokens).toBe(0);
      expect(context.actualCost.usd).toBe(0);
    });

    it("should add evidence to context", () => {
      const evidence = {
        id: crypto.randomUUID(),
        taskId,
        type: EvidenceType.CI_LOG,
        filePath: "s3://bucket/ci-log.txt",
        sha: "abc123def456".padEnd(40, "0"),
        timestamp: new Date().toISOString(),
        metadata: { tests: 100 },
        redacted: false,
      };

      context.addEvidence(evidence);

      expect(context.evidence.length).toBe(1);
      expect(context.evidence[0]).toEqual(evidence);
      expect(context.auditTrail.length).toBeGreaterThan(0);
    });

    it("should add review to context", () => {
      const review = {
        reviewer: "reviewer-1",
        status: "PENDING" as const,
        timestamp: new Date().toISOString(),
      };

      context.addReview(review);

      expect(context.reviews.length).toBe(1);
      expect(context.reviews[0].status).toBe("PENDING");
    });

    it("should check dependencies are complete", () => {
      context.dependencies = ["dep1", "dep2"];

      expect(context.isDependenciesComplete()).toBe(false);

      context.markDependencyComplete("dep1");
      expect(context.isDependenciesComplete()).toBe(false);

      context.markDependencyComplete("dep2");
      expect(context.isDependenciesComplete()).toBe(true);
    });

    it("should identify blockers when evidence is missing", () => {
      const blockers = context.getBlockers();

      expect(blockers.length).toBeGreaterThan(0);
      expect(blockers.some((b) => b.includes("NO_EVIDENCE"))).toBe(true);
    });

    it("should identify blockers when review is missing", () => {
      const evidence = {
        id: crypto.randomUUID(),
        taskId,
        type: EvidenceType.CI_LOG,
        filePath: "s3://bucket/ci-log.txt",
        sha: "abc123def456".padEnd(40, "0"),
        timestamp: new Date().toISOString(),
        metadata: {},
        redacted: false,
      };
      context.addEvidence(evidence);

      const blockers = context.getBlockers();

      expect(blockers.some((b) => b.includes("NO_REVIEW"))).toBe(true);
    });

    it("should identify blockers when judge verdict is missing", () => {
      const evidence = {
        id: crypto.randomUUID(),
        taskId,
        type: EvidenceType.CI_LOG,
        filePath: "s3://bucket/ci-log.txt",
        sha: "abc123def456".padEnd(40, "0"),
        timestamp: new Date().toISOString(),
        metadata: {},
        redacted: false,
      } as any;
      context.addEvidence(evidence);

      const review = {
        reviewer: "reviewer-1",
        status: "APPROVED" as const,
        timestamp: new Date().toISOString(),
      };
      context.addReview(review);

      const blockers = context.getBlockers();

      expect(blockers.some((b) => b.includes("NO_JUDGMENT"))).toBe(true);
    });

    it("should calculate progress toward closure", () => {
      expect(context.getProgress()).toBeLessThan(100);

      const evidence = {
        id: crypto.randomUUID(),
        taskId,
        type: EvidenceType.CI_LOG,
        filePath: "s3://bucket/ci-log.txt",
        sha: "abc123def456".padEnd(40, "0"),
        timestamp: new Date().toISOString(),
        metadata: {},
        redacted: false,
      };
      context.addEvidence(evidence);

      expect(context.getProgress()).toBeGreaterThan(0);
    });

    it("should track cost accumulation", () => {
      expect(context.actualCost.tokens).toBe(0);

      context.addCost({ tokens: 100, usd: 0.01 });
      expect(context.actualCost.tokens).toBe(100);
      expect(context.actualCost.usd).toBe(0.01);

      context.addCost({ tokens: 50, usd: 0.005 });
      expect(context.actualCost.tokens).toBe(150);
      expect(context.actualCost.usd).toBe(0.015);
    });

    it("should provide summary", () => {
      const summary = context.getSummary();

      expect(summary.taskId).toBe(taskId);
      expect(summary.traceId).toBe(context.traceId);
      expect(summary.evidenceCount).toBe(0);
      expect(summary.blockers.length).toBeGreaterThan(0);
      expect(summary.isReadyForClosure).toBe(false);
    });
  });

  describe("DependencyRunner", () => {
    let runner: DependencyRunner;

    beforeEach(() => {
      runner = new DependencyRunner();
    });

    it("should detect cycles in dependency graph", async () => {
      const task1Id = crypto.randomUUID();
      const task2Id = crypto.randomUUID();

      const task1: TaskType = createTask({
        id: task1Id,
        title: "Task 1",
        goal: "Task 1 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-1",
        dependencies: [task2Id],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const task2: TaskType = createTask({
        id: task2Id,
        title: "Task 2",
        goal: "Task 2 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-2",
        dependencies: [task1Id],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const result = await runner.runDependencyGraph(
        [task1, task2],
        async () => ({
          status: TaskStatus.CLOSED,
          evidence: [],
          reviews: [],
          judgments: [],
        })
      );

      expect(result.success).toBe(false);
      expect(result.cycles && result.cycles.length > 0).toBe(true);
    });

    it("should execute tasks in topological order", async () => {
      const executionOrder: string[] = [];
      const task1Id = crypto.randomUUID();
      const task2Id = crypto.randomUUID();

      const task1: TaskType = createTask({
        id: task1Id,
        title: "Task 1",
        goal: "Task 1 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-1",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const task2: TaskType = createTask({
        id: task2Id,
        title: "Task 2",
        goal: "Task 2 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-2",
        dependencies: [task1Id],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const result = await runner.runDependencyGraph(
        [task1, task2],
        async (task) => {
          executionOrder.push(task.id);
          return {
            status: TaskStatus.CLOSED,
            evidence: [],
            reviews: [],
            judgments: [],
          };
        }
      );

      expect(result.success).toBe(true);
      expect(executionOrder).toEqual([task1Id, task2Id]);
    });

    it("should handle task execution failures", async () => {
      const task1Id = crypto.randomUUID();
      const task1: TaskType = createTask({
        id: task1Id,
        title: "Task 1",
        goal: "Task 1 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-1",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const result = await runner.runDependencyGraph(
        [task1],
        async () => {
          throw new Error("Execution failed");
        }
      );

      expect(result.success).toBe(false);
      expect(result.failedTasks).toContain(task1Id);
    });

    it("should collect evidence from all executed tasks", async () => {
      const task1Id = crypto.randomUUID();
      const evidence1 = {
        id: crypto.randomUUID(),
        taskId: task1Id,
        type: EvidenceType.CI_LOG,
        filePath: "s3://bucket/ci-log.txt",
        sha: "abc123def456".padEnd(40, "0"),
        timestamp: new Date().toISOString(),
        metadata: {},
        redacted: false,
      };

      const task1: TaskType = createTask({
        id: task1Id,
        title: "Task 1",
        goal: "Task 1 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-1",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const result = await runner.runDependencyGraph(
        [task1],
        async () => ({
          status: TaskStatus.CLOSED,
          evidence: [evidence1],
          reviews: [],
          judgments: [],
        })
      );

      expect(result.allEvidence.length).toBe(1);
      expect(result.allEvidence[0]).toEqual(evidence1);
    });
  });

  describe("MasterOrchestrator", () => {
    it("should launch a task", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      expect(task.id).toBeDefined();
      expect(task.goal).toBe("Test goal");
      expect(task.assignedAgent).toBe("agent-1");
      expect(task.status).toBe(TaskStatus.TODO);
    });

    it("should execute a task", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");
      const result = await orchestrator.executeTask(task.id);

      expect(result.task.id).toBe(task.id);
      expect(result.status).toBe(TaskStatus.REVIEW);
      expect(result.auditTrail.length).toBeGreaterThan(0);
    });

    it("should transition task states", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      await orchestrator.transitionState(task.id, TaskStatus.WORKING);
      const context = orchestrator.getExecutionContext(task.id);
      expect(context?.state).toBe(TaskStatus.WORKING);

      await orchestrator.transitionState(task.id, TaskStatus.REVIEW);
      expect(context?.state).toBe(TaskStatus.REVIEW);
    });

    it("should prevent invalid state transitions", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      await expect(
        orchestrator.transitionState(task.id, TaskStatus.CLOSED)
      ).rejects.toThrow();
    });

    it("should request review from independent reviewer", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");
      const review = await orchestrator.requestReview(
        task.id,
        "reviewer-1"
      );

      expect(review.reviewer).toBe("reviewer-1");
      expect(review.status).toBe("APPROVED");

      const context = orchestrator.getExecutionContext(task.id);
      expect(context?.reviews.length).toBeGreaterThan(0);
    });

    it("should prevent self-review", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      await expect(
        orchestrator.requestReview(task.id, "agent-1")
      ).rejects.toThrow("Reviewer cannot be the executor");
    });

    it("should request judgment from independent judge", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");
      await orchestrator.executeTask(task.id);
      await orchestrator.requestReview(task.id, "reviewer-1");

      const judgment = await orchestrator.requestJudgment(
        task.id,
        "judge-1"
      );

      expect(judgment.taskId).toBe(task.id);
      expect(judgment.judgeAgent).toBe("judge-1");

      const context = orchestrator.getExecutionContext(task.id);
      expect(context?.judgments.length).toBeGreaterThan(0);
    });

    it("should prevent judge from being executor", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      await expect(
        orchestrator.requestJudgment(task.id, "agent-1")
      ).rejects.toThrow("Judge cannot be the executor");
    });

    it("should request human approval", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      const approval = await orchestrator.requestHumanApproval(
        task.id,
        "PRODUCTION_DEPLOY",
        "human@example.com"
      );

      expect(approval.taskId).toBe(task.id);
      expect(approval.approverHuman).toBe("human@example.com");

      const context = orchestrator.getExecutionContext(task.id);
      expect(context?.approvals.length).toBeGreaterThan(0);
    });

    it("should handle task failure with recovery", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      const recovery = await orchestrator.handleTaskFailure(
        task.id,
        new Error("Execution timeout")
      );

      expect(recovery.actionTaken).toBeDefined();
      expect(recovery.nextState).toBeDefined();
    });

    it("should get task status report", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");
      await orchestrator.executeTask(task.id);

      const status = await orchestrator.getTaskStatus(task.id);

      expect(status.taskId).toBe(task.id);
      expect(status.currentState).toBeDefined();
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
      expect(status.blockers).toBeDefined();
      expect(status.costToDate).toBeDefined();
    });

    it("should block closure without required conditions", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");

      await expect(
        orchestrator.closeTask(task.id, undefined)
      ).rejects.toThrow("Cannot close task");
    });

    it("should close task with all requirements met", async () => {
      const task = await orchestrator.launchTask("Test goal", "agent-1");
      const context = orchestrator.getExecutionContext(task.id);

      if (context) {
        // Transition through proper states
        await orchestrator.transitionState(task.id, TaskStatus.WORKING);

        // Add evidence
        const evidence = {
          id: crypto.randomUUID(),
          taskId: task.id,
          type: EvidenceType.CI_LOG,
          filePath: "s3://bucket/ci-log.txt",
          sha: "abc123def456".padEnd(40, "0"),
          timestamp: new Date().toISOString(),
          metadata: {},
          redacted: false,
        };
        context.addEvidence(evidence);

        // Transition to REVIEW
        await orchestrator.transitionState(task.id, TaskStatus.REVIEW);

        // Add review
        context.addReview({
          reviewer: "reviewer-1",
          status: "APPROVED",
          timestamp: new Date().toISOString(),
        });

        // Add judgment
        context.addJudgment({
          id: crypto.randomUUID(),
          taskId: task.id,
          judgeAgent: "judge-1",
          criteria: {
            branchCorrect: true,
            shaUpdated: true,
            ciPassed: true,
            testsPassed: true,
            evidenceSufficient: true,
            independentReviewExists: true,
            judgeNotExecutor: true,
            dependencyComplete: true,
            humanApprovalProvided: true,
            productionProofReal: true,
          },
          verdict: JudgeVerdict.PASS,
          reason: "All criteria met",
          timestamp: new Date().toISOString(),
          canClose: true,
        });

        // Transition to PASS
        await orchestrator.transitionState(task.id, TaskStatus.PASS);
      }

      const closedTask = await orchestrator.closeTask(task.id, {
        result: "success",
      });

      expect(closedTask.status).toBe(TaskStatus.CLOSED);
      expect(closedTask.closedAt).toBeDefined();
    });

    it("should execute dependency graph", async () => {
      const task1Id = crypto.randomUUID();
      const task2Id = crypto.randomUUID();

      const task1 = createTask({
        id: task1Id,
        title: "Task 1",
        goal: "Task 1 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-1",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const task2 = createTask({
        id: task2Id,
        title: "Task 2",
        goal: "Task 2 goal",
        status: TaskStatus.TODO,
        phaseTarget: "B2",
        assignedAgent: "agent-1",
        estimatedCost: { tokens: 0, usd: 0 },
        auditTraceId: "trace-2",
        dependencies: [task1Id],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const result = await orchestrator.executeDependencyGraph([
        task1,
        task2,
      ]);

      expect(result.success).toBe(false); // Will fail because tasks can't close without full conditions
      expect(result.executionOrder.length).toBeGreaterThan(0);
    });

    it("should throw when task not found", async () => {
      const fakeTaskId = crypto.randomUUID();

      await expect(
        orchestrator.executeTask(fakeTaskId)
      ).rejects.toThrow("Task");

      await expect(
        orchestrator.getTaskStatus(fakeTaskId)
      ).rejects.toThrow("Task");
    });
  });
});
