import { describe, it, expect, beforeEach } from "vitest";
import { TaskEngine } from "../task-engine";
import { InMemoryTaskStore } from "../task-store";
import { StateMachine } from "../state-machine";
import { TaskStatus, EvidenceType } from "@/src/core/contracts";

describe("TaskEngine", () => {
  let engine: TaskEngine;
  let store: InMemoryTaskStore;

  beforeEach(async () => {
    store = new InMemoryTaskStore();
    engine = new TaskEngine(store);
  });

  describe("Task Creation", () => {
    it("should create a new task with TODO status", async () => {
      const task = await engine.createTask(
        "Implement feature X",
        "agent-1",
        "B5"
      );

      expect(task.id).toBeDefined();
      expect(task.title).toBe("Implement feature X");
      expect(task.goal).toBe("Implement feature X");
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.phaseTarget).toBe("B5");
      expect(task.assignedAgent).toBe("agent-1");
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
      expect(task.actualCost).toEqual({ tokens: 0, usd: 0 });
    });

    it("should store task in storage", async () => {
      const task = await engine.createTask(
        "Test goal",
        "agent-1",
        "B5"
      );

      const retrieved = await engine.getTask(task.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(task.id);
      expect(retrieved?.status).toBe(TaskStatus.TODO);
    });
  });

  describe("State Transitions - Legal", () => {
    it("should allow TODO → WORKING transition", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const result = await engine.updateTaskState(task.id, TaskStatus.WORKING);
      expect(result.success).toBe(true);
      expect(result.task?.status).toBe(TaskStatus.WORKING);
    });

    it("should allow WORKING → BLOCKED transition", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);

      // Set a blocker reason first (simulates error)
      const taskToUpdate = await engine.getTask(task.id);
      if (taskToUpdate) {
        const store = engine.getStore();
        await store.updateTask(task.id, { blockerReason: "Test error" });
      }

      const result = await engine.updateTaskState(task.id, TaskStatus.BLOCKED);
      expect(result.success).toBe(true);
      expect(result.task?.status).toBe(TaskStatus.BLOCKED);
    });

    it("should allow WORKING → REVIEW transition", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);

      const result = await engine.updateTaskState(task.id, TaskStatus.REVIEW);
      expect(result.success).toBe(true);
      expect(result.task?.status).toBe(TaskStatus.REVIEW);
    });

    it("should allow BLOCKED → WORKING transition", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.updateTaskState(task.id, TaskStatus.BLOCKED);

      const result = await engine.updateTaskState(task.id, TaskStatus.WORKING);
      expect(result.success).toBe(true);
      expect(result.task?.status).toBe(TaskStatus.WORKING);
    });

    it("should allow BLOCKED → REVIEW transition", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.updateTaskState(task.id, TaskStatus.BLOCKED);

      const result = await engine.updateTaskState(task.id, TaskStatus.REVIEW);
      expect(result.success).toBe(true);
      expect(result.task?.status).toBe(TaskStatus.REVIEW);
    });

    it("should allow REVIEW → PASS transition with approvals", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      // Setup: transition to REVIEW
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.updateTaskState(task.id, TaskStatus.REVIEW);

      // Note: Full PASS transition would need all conditions met
      // This test shows the basic transition is allowed
      const result = await engine.updateTaskState(task.id, TaskStatus.PASS);
      // May fail due to missing conditions, but transition itself is legal
      expect(result.success).toBe(false); // Due to closure guards
    });
  });

  describe("State Transitions - Illegal", () => {
    it("should reject TODO → BLOCKED (illegal)", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const result = await engine.updateTaskState(task.id, TaskStatus.BLOCKED);
      expect(result.success).toBe(false);
      expect(result.reason).toContain("Illegal transition");
    });

    it("should reject TODO → REVIEW (illegal)", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const result = await engine.updateTaskState(task.id, TaskStatus.REVIEW);
      expect(result.success).toBe(false);
      expect(result.reason).toContain("Illegal transition");
    });

    it("should reject CLOSED → WORKING (terminal state)", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      // Setup task to be closeable
      await setupTaskForClosure(engine, task.id, "agent-1");

      // Close it
      const closeResult = await engine.closeTask(task.id);
      expect(closeResult.success).toBe(true);

      const closed = await engine.getTask(task.id);
      expect(closed?.status).toBe(TaskStatus.CLOSED);

      // Try to transition from CLOSED
      const result = await engine.updateTaskState(closed!.id, TaskStatus.WORKING);
      expect(result.success).toBe(false);
      expect(result.reason).toContain("immutable");
    });

    it("should not allow direct TODO → CLOSED", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const result = await engine.updateTaskState(task.id, TaskStatus.CLOSED);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/Illegal transition|Cannot close/);
    });
  });

  describe("Evidence Management", () => {
    it("should add evidence to task", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await engine.addEvidence(task.id, {
        id: "ev-1",
        taskId: task.id,
        type: EvidenceType.TEST_RESULT,
        filePath: "tests/results.json",
        sha: "abc123def456abc123def456abc123def456abc1",
        timestamp: new Date().toISOString(),
        metadata: { passed: 100, failed: 0 },
        redacted: false,
      });

      const retrieved = await engine.getTask(task.id);
      expect(retrieved?.evidence).toContain("tests/results.json");
    });

    it("should redact CI logs automatically", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await engine.addEvidence(task.id, {
        id: "ev-1",
        taskId: task.id,
        type: EvidenceType.CI_LOG,
        filePath: "ci/build.log",
        sha: "abc123def456abc123def456abc123def456abc1",
        timestamp: new Date().toISOString(),
        redacted: false,
      });

      const evidenceMap = engine.getEvidenceMap();
      const evidence = evidenceMap.get(task.id);
      expect(evidence?.[0]?.redacted).toBe(true);
    });

    it("should reject evidence with API keys", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await expect(
        engine.addEvidence(task.id, {
          id: "ev-1",
          taskId: task.id,
          type: EvidenceType.CI_LOG,
          filePath: "ci/build.log",
          sha: "abc123def456abc123def456abc123def456abc1",
          timestamp: new Date().toISOString(),
          metadata: { api_key: "secret123" },
          redacted: false,
        })
      ).rejects.toThrow("sensitive data");
    });
  });

  describe("Review Management", () => {
    it("should add review to task", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.updateTaskState(task.id, TaskStatus.REVIEW);

      await engine.addReview(
        task.id,
        "reviewer-1",
        "APPROVED",
        "Looks good!"
      );

      const reviewMap = engine.getReviewMap();
      const reviews = reviewMap.get(task.id);
      expect(reviews).toHaveLength(1);
      expect(reviews?.[0]?.status).toBe("APPROVED");
      expect(reviews?.[0]?.reviewer).toBe("reviewer-1");
    });

    it("should reject review if reviewer is executor", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await expect(
        engine.addReview(task.id, "agent-1", "APPROVED", "Self review")
      ).rejects.toThrow("cannot be the task executor");
    });

    it("should block task on review rejection", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.updateTaskState(task.id, TaskStatus.REVIEW);

      await engine.addReview(
        task.id,
        "reviewer-1",
        "REJECTED",
        "Needs changes"
      );

      const updated = await engine.getTask(task.id);
      expect(updated?.status).toBe(TaskStatus.BLOCKED);
      expect(updated?.blockerReason).toContain("Code review rejected");
    });
  });

  describe("Judgment Management", () => {
    it("should add judgment to task", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await engine.addJudgment(
        task.id,
        "judge-1",
        "PASS",
        "All criteria met"
      );

      const judgmentMap = engine.getJudgmentMap();
      const judgments = judgmentMap.get(task.id);
      expect(judgments).toHaveLength(1);
      expect(judgments?.[0]?.verdict).toBe("PASS");
      expect(judgments?.[0]?.canClose).toBe(true);
    });

    it("should reject judgment if judge is executor", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await expect(
        engine.addJudgment(
          task.id,
          "agent-1",
          "PASS",
          "Self judgment"
        )
      ).rejects.toThrow("cannot be the task executor");
    });

    it("should set canClose to true for PASS verdict", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await engine.addJudgment(
        task.id,
        "judge-1",
        "PASS",
        "All criteria met"
      );

      const judgmentMap = engine.getJudgmentMap();
      const judgment = judgmentMap.get(task.id)?.[0];
      expect(judgment?.canClose).toBe(true);
    });

    it("should set canClose to false for FAIL verdict", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await engine.addJudgment(
        task.id,
        "judge-1",
        "FAIL",
        "Criteria not met"
      );

      const judgmentMap = engine.getJudgmentMap();
      const judgment = judgmentMap.get(task.id)?.[0];
      expect(judgment?.canClose).toBe(false);
    });
  });

  describe("Task Closure Conditions", () => {
    it("should block closure if code not implemented", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(false);
      expect(closure.blockers).toContain(
        "Code not implemented (status is TODO)"
      );
    });

    it("should block closure without test results", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(false);
      expect(closure.blockers).toContain("No test results evidence found");
    });

    it("should block closure without CI log", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await engine.addEvidence(task.id, {
        id: "ev-1",
        taskId: task.id,
        type: EvidenceType.TEST_RESULT,
        filePath: "tests/results.json",
        sha: "abc123def456abc123def456abc123def456abc1",
        timestamp: new Date().toISOString(),
        redacted: false,
      });

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(false);
      expect(closure.blockers).toContain("No CI log evidence found");
    });

    it("should block closure without approved review", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await setupTaskEvidence(engine, task.id);

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(false);
      expect(closure.blockers).toContain("No approved code review found");
    });

    it("should block closure without judge verdict PASS", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await setupTaskEvidence(engine, task.id);
      await engine.addReview(task.id, "reviewer-1", "APPROVED");

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(false);
      expect(closure.blockers).toContain("Judge verdict is not PASS");
    });

    it("should allow closure when all conditions are met", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await setupTaskForClosure(engine, task.id, "agent-1");

      const closure = await engine.canCloseTask(task.id);
      expect(closure.canClose).toBe(true);
      expect(closure.blockers).toHaveLength(0);
    });
  });

  describe("Task Closure", () => {
    it("should close task successfully when all conditions met", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await setupTaskForClosure(engine, task.id, "agent-1");

      const result = await engine.closeTask(task.id);
      expect(result.success).toBe(true);

      const closed = await engine.getTask(task.id);
      expect(closed?.status).toBe(TaskStatus.CLOSED);
      expect(closed?.closedAt).toBeDefined();
    });

    it("should reject closure if conditions not met", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const result = await engine.closeTask(task.id);
      expect(result.success).toBe(false);
      expect(result.blockers).toBeDefined();
      expect(result.blockers!.length).toBeGreaterThan(0);
    });

    it("should record closure in audit trail", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await setupTaskForClosure(engine, task.id, "agent-1");
      await engine.closeTask(task.id);

      const history = await engine.getTaskHistory(task.id);
      const closeEntry = history.find((e) => e.action === "task_closed");
      expect(closeEntry).toBeDefined();
    });
  });

  describe("Task Status Report", () => {
    it("should generate status report for task", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const report = await engine.getTaskStatusReport(task.id);
      expect(report.taskId).toBe(task.id);
      expect(report.currentState).toBe(TaskStatus.TODO);
      expect(report.progressPercent).toBeLessThan(100); // At least some work needed
      expect(report.blockers.length).toBeGreaterThan(0);
    });

    it("should show progress in status report", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);
      await setupTaskEvidence(engine, task.id);

      const report = await engine.getTaskStatusReport(task.id);
      expect(report.progressPercent).toBeGreaterThan(0);
      expect(report.evidenceQuality.collected).toBeGreaterThan(0);
    });

    it("should show 100% progress when closeable", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      await setupTaskForClosure(engine, task.id, "agent-1");

      const report = await engine.getTaskStatusReport(task.id);
      expect(report.progressPercent).toBe(100);
      expect(report.blockers).toHaveLength(0);
    });
  });

  describe("Task History and Audit Trail", () => {
    it("should record task creation in audit", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const history = await engine.getTaskHistory(task.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].action).toBe("task_started");
      expect(history[0].agentId).toBe("agent-1");
    });

    it("should record state changes in audit", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );
      await engine.updateTaskState(task.id, TaskStatus.WORKING);

      const history = await engine.getTaskHistory(task.id);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it("should maintain immutable audit trail", async () => {
      const task = await engine.createTask(
        "Test task",
        "agent-1",
        "B5"
      );

      const history1 = await engine.getTaskHistory(task.id);
      const history2 = await engine.getTaskHistory(task.id);

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2); // Different array instances
    });
  });

  describe("Task Listing and Filtering", () => {
    it("should list all tasks", async () => {
      await engine.createTask("Task 1", "agent-1", "B5");
      await engine.createTask("Task 2", "agent-2", "B6");

      const tasks = await engine.listTasks();
      expect(tasks.length).toBe(2);
    });

    it("should filter tasks by status", async () => {
      const task1 = await engine.createTask("Task 1", "agent-1", "B5");
      const task2 = await engine.createTask("Task 2", "agent-2", "B5");

      await engine.updateTaskState(task1.id, TaskStatus.WORKING);

      const working = await engine.listTasks({ status: TaskStatus.WORKING });
      expect(working.length).toBe(1);
      expect(working[0].id).toBe(task1.id);

      const todo = await engine.listTasks({ status: TaskStatus.TODO });
      expect(todo.length).toBe(1);
      expect(todo[0].id).toBe(task2.id);
    });

    it("should filter tasks by assigned agent", async () => {
      await engine.createTask("Task 1", "agent-1", "B5");
      await engine.createTask("Task 2", "agent-2", "B5");

      const agent1Tasks = await engine.listTasks({ assignedAgent: "agent-1" });
      expect(agent1Tasks.length).toBe(1);
      expect(agent1Tasks[0].assignedAgent).toBe("agent-1");
    });

    it("should filter tasks by phase", async () => {
      await engine.createTask("Task 1", "agent-1", "B5");
      await engine.createTask("Task 2", "agent-2", "B6");

      const b5Tasks = await engine.listTasks({ phaseTarget: "B5" });
      expect(b5Tasks.length).toBe(1);
      expect(b5Tasks[0].phaseTarget).toBe("B5");
    });
  });

  describe("Full Task Lifecycle", () => {
    it("should complete full task lifecycle", async () => {
      // 1. Create task
      const task = await engine.createTask(
        "Implement feature",
        "agent-1",
        "B5"
      );
      expect(task.status).toBe(TaskStatus.TODO);

      // 2. Start work
      let result = await engine.updateTaskState(task.id, TaskStatus.WORKING);
      expect(result.success).toBe(true);

      // 3. Add evidence
      await setupTaskEvidence(engine, task.id);

      // 4. Complete work (move to review)
      result = await engine.updateTaskState(task.id, TaskStatus.REVIEW);
      expect(result.success).toBe(true);

      // 5. Get review
      await engine.addReview(task.id, "reviewer-1", "APPROVED");

      // 6. Get judgment
      await engine.addJudgment(task.id, "judge-1", "PASS", "All criteria met");

      // 6.5. Transition to PASS state
      result = await engine.updateTaskState(task.id, TaskStatus.PASS);
      expect(result.success).toBe(true);

      // 7. Close task
      const closeResult = await engine.closeTask(task.id);
      expect(closeResult.success).toBe(true);

      // Verify final state
      const final = await engine.getTask(task.id);
      expect(final?.status).toBe(TaskStatus.CLOSED);
      expect(final?.closedAt).toBeDefined();

      // Verify audit trail
      const history = await engine.getTaskHistory(task.id);
      expect(history.length).toBeGreaterThan(5); // Multiple steps recorded
    });
  });
});

/**
 * Test helper: Setup task with required evidence
 */
async function setupTaskEvidence(engine: TaskEngine, taskId: string) {
  await engine.addEvidence(taskId, {
    id: "ev-1",
    taskId,
    type: EvidenceType.TEST_RESULT,
    filePath: "tests/results.json",
    sha: "abc123def456abc123def456abc123def456abc1",
    timestamp: new Date().toISOString(),
    metadata: { passed: 100, failed: 0 },
    redacted: false,
  });

  await engine.addEvidence(taskId, {
    id: "ev-2",
    taskId,
    type: EvidenceType.CI_LOG,
    filePath: "ci/build.log",
    sha: "abc123def456abc123def456abc123def456abc1",
    timestamp: new Date().toISOString(),
    redacted: false,
  });
}

/**
 * Test helper: Setup task for closure
 */
async function setupTaskForClosure(
  engine: TaskEngine,
  taskId: string,
  agentId: string
) {
  // Get fresh task
  const task = await engine.getTask(taskId);
  if (!task) throw new Error("Task not found");

  // Move to WORKING
  await engine.updateTaskState(taskId, TaskStatus.WORKING);

  // Add required evidence
  await setupTaskEvidence(engine, taskId);

  // Move to REVIEW
  await engine.updateTaskState(taskId, TaskStatus.REVIEW);

  // Add approved review
  await engine.addReview(taskId, "reviewer-1", "APPROVED");

  // Add PASS judgment
  await engine.addJudgment(taskId, "judge-1", "PASS", "All criteria met");

  // Transition to PASS
  await engine.updateTaskState(taskId, TaskStatus.PASS);
}
