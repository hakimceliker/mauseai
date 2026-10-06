import { describe, expect, it } from "vitest";
import { TaskEngine } from "@/src/core/task-engine/task-engine";
import { InMemoryTaskStore } from "@/src/core/task-engine/task-store";
import { DependencyRunner } from "@/src/core/orchestrator/dependency-runner";
import { AgentRegistry } from "@/src/core/agents/agent-registry";
import { RecoveryEngine } from "@/src/core/recovery/recovery-engine";
import { ErrorClassification, RecoveryAction } from "@/src/core/recovery/types";
import { Watchdog } from "@/src/core/watchdog/watchdog";
import { JudgeEngine } from "@/src/core/judge/judge-engine";
import { EvidenceValidator } from "@/src/core/evidence/evidence-validator";
import { HumanApprovalSystem, OperationType } from "@/src/core/approval/human-approval";
import {
  createTask,
  EvidenceType,
  TaskStatus,
} from "@/src/core/contracts";

const sha = "a".repeat(40);

describe("Phase I - implemented core integration scenarios", () => {
  it("scenario 1: closes a task only after the full closure gate", async () => {
    const engine = new TaskEngine(new InMemoryTaskStore());
    const task = await engine.createTask("Implement the core flow", "executor", "B5");

    await engine.updateTaskState(task.id, TaskStatus.WORKING);
    await engine.addEvidence(task.id, {
      id: crypto.randomUUID(), taskId: task.id, type: EvidenceType.TEST_RESULT,
      filePath: "evidence/tests.json", sha, timestamp: new Date().toISOString(),
      metadata: { passed: 1, failed: 0 }, redacted: false,
    });
    await engine.addEvidence(task.id, {
      id: crypto.randomUUID(), taskId: task.id, type: EvidenceType.CI_LOG,
      filePath: "evidence/ci.log", sha, timestamp: new Date().toISOString(),
      metadata: { status: "success" }, redacted: false,
    });
    await engine.addReview(task.id, "independent-reviewer", "APPROVED", "Verified");
    await engine.addJudgment(task.id, "independent-judge", "PASS", "All criteria met");

    expect((await engine.canCloseTask(task.id)).canClose).toBe(true);
    expect((await engine.updateTaskState(task.id, TaskStatus.REVIEW)).success).toBe(true);
    expect((await engine.updateTaskState(task.id, TaskStatus.PASS)).success).toBe(true);
    expect((await engine.closeTask(task.id)).success).toBe(true);
    expect((await engine.getTask(task.id))?.status).toBe(TaskStatus.CLOSED);
  });

  it("scenario 2: executes a dependent task only after its dependency", async () => {
    const first = createTask({
      id: crypto.randomUUID(), title: "first", goal: "first", status: TaskStatus.TODO,
      phaseTarget: "B2", dependencies: [], assignedAgent: "executor",
      estimatedCost: { tokens: 1, usd: 0 }, retryCount: 0, maxRetries: 1,
      evidence: [], humanApprovalRequired: false, humanApprovalStatus: "NONE",
      auditTraceId: "trace-first",
    });
    const second = createTask({
      id: crypto.randomUUID(), title: "second", goal: "second", status: TaskStatus.TODO,
      phaseTarget: "B2", dependencies: [first.id], assignedAgent: "executor",
      estimatedCost: { tokens: 1, usd: 0 }, retryCount: 0, maxRetries: 1,
      evidence: [], humanApprovalRequired: false, humanApprovalStatus: "NONE",
      auditTraceId: "trace-second",
    });
    const order: string[] = [];
    const result = await new DependencyRunner().runDependencyGraph([second, first], async (task) => {
      order.push(task.id);
      return { status: TaskStatus.CLOSED, evidence: [], reviews: [], judgments: [] };
    });

    expect(result.success).toBe(true);
    expect(order).toEqual([first.id, second.id]);
  });

  it("scenario 3: executes independent tasks without dependency blocking", async () => {
    const makeTask = (name: string) => createTask({
      id: crypto.randomUUID(), title: name, goal: name, status: TaskStatus.TODO,
      phaseTarget: "B2", dependencies: [], assignedAgent: "executor",
      estimatedCost: { tokens: 1, usd: 0 }, retryCount: 0, maxRetries: 1,
      evidence: [], humanApprovalRequired: false, humanApprovalStatus: "NONE",
      auditTraceId: `trace-${name}`,
    });
    const tasks = [makeTask("one"), makeTask("two"), makeTask("three")];
    const result = await new DependencyRunner().runDependencyGraph(tasks, async () => ({
      status: TaskStatus.CLOSED, evidence: [], reviews: [], judgments: [],
    }));

    expect(result.success).toBe(true);
    expect(result.totalTasksExecuted).toBe(3);
    expect(result.failedTasks).toHaveLength(0);
  });

  it("scenario 4: detects a stale task and creates a retry recovery plan", async () => {
    const recovery = new RecoveryEngine({ maxRetries: 3, baseBackoffMs: 1, maxBackoffMs: 10 });
    const watchdog = new Watchdog({ stuckThresholdMs: 1, idleThresholdMs: 1, maxConsecutiveErrors: 3 });
    const taskId = "integration-recovery-task" as never;
    watchdog.startMonitoring(taskId);
    const old = new Date(Date.now() - 100);
    watchdog.recordStepExecution(taskId, "step-1" as never, {
      startTime: old, endTime: old, status: "running", retriesUsed: 0,
    });
    const detection = await watchdog.detectStuckTask(taskId);
    const classified = await recovery.classifyError({ taskId, error: new Error("timeout"), timestamp: new Date() });
    const plan = await recovery.createRecoveryPlan(taskId, classified);

    expect(detection.isStuck).toBe(true);
    expect(classified.classification).toBe(ErrorClassification.TIMEOUT);
    expect(plan.primaryAction).toBe(RecoveryAction.RETRY);
    watchdog.stopMonitoring(taskId);
    watchdog.clearTaskData(taskId);
  });

  it("scenario 5: selects an available agent for a capable task", () => {
    const registry = new AgentRegistry();
    const task = createTask({
      id: crypto.randomUUID(), title: "Implement a code change", goal: "Implement a code change",
      status: TaskStatus.TODO, phaseTarget: "B1", dependencies: [], assignedAgent: "executor",
      estimatedCost: { tokens: 1, usd: 0 }, retryCount: 0, maxRetries: 1,
      evidence: [], humanApprovalRequired: false, humanApprovalStatus: "NONE",
      auditTraceId: "trace-agent-selection",
    });

    const selected = registry.selectAgentForTask(task);
    expect(selected).toBeDefined();
    expect(selected.id).not.toBe(task.assignedAgent);
    expect(selected.capability.length).toBeGreaterThan(0);
  });

  it("scenario 6: rejects self-review and accepts an independent reviewer", async () => {
    const engine = new TaskEngine(new InMemoryTaskStore());
    const task = await engine.createTask("Reviewable task", "executor", "B5");
    await engine.updateTaskState(task.id, TaskStatus.WORKING);
    await engine.updateTaskState(task.id, TaskStatus.REVIEW);

    await expect(engine.addReview(task.id, "executor", "APPROVED")).rejects.toThrow("executor");
    await engine.addReview(task.id, "reviewer", "APPROVED", "Independent review");
    expect(engine.getReviewMap().get(task.id)?.[0]?.reviewer).toBe("reviewer");
  });

  it("scenario 7: judge validates all ten acceptance criteria", async () => {
    const judge = new JudgeEngine();
    const context = {
      taskId: "judge-task", executorId: "executor", branch: "feature/test", sha,
      ciStatus: "passed" as const, testStatus: "passed" as const,
      hasIndependentReview: true, approvals: ["human"], dependencies: [],
      productionProof: { url: "https://example.com", timestamp: new Date(), verified: true },
    };
    const evidence = [{
      id: "evidence-1", type: "test_result" as const, content: "tests passed",
      source: "github-actions", timestamp: new Date(),
    }];
    const verdict = await judge.judge("judge-task", context, evidence, "judge", "feature/test", sha);

    expect(verdict.status).toBe("PASS");
    expect(verdict.canClose).toBe(true);
    expect(Object.values(verdict.criteria)).toHaveLength(10);
    expect(Object.values(verdict.criteria).every(Boolean)).toBe(true);
  });

  it("scenario 8: task engine enforces judge independence", async () => {
    const engine = new TaskEngine(new InMemoryTaskStore());
    const task = await engine.createTask("Judgeable task", "executor", "B5");

    await expect(engine.addJudgment(task.id, "executor", "PASS", "self-judgment"))
      .rejects.toThrow("executor");
    await engine.addJudgment(task.id, "judge", "PASS", "Independent judgment");
    expect(engine.getJudgmentMap().get(task.id)?.[0]?.judgeId).toBe("judge");
  });

  it("scenario 9: evidence validator removes secrets from evidence output", async () => {
    const validator = new EvidenceValidator();
    const raw = "CI passed; api_key=abcdefghijklmnopqrstuvwxyz123456";
    const redacted = validator.redactSensitiveData(raw);
    const validation = await validator.validate({
      id: "evidence-2", type: "ci_log", content: raw, source: "github-actions", timestamp: new Date(),
    });

    expect(validation.valid).toBe(false);
    expect(validation.secretsDetected.length).toBeGreaterThan(0);
    expect(redacted).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
    expect(redacted).toContain("[REDACTED]");
  });

  it("scenario 10: critical operations remain blocked until human approval", () => {
    const approvals = new HumanApprovalSystem();
    const request = approvals.requestApproval(
      OperationType.PRODUCTION_DEPLOY, "deployer", "deploy", "op-1", "release"
    );

    expect(() => approvals.enforceApproval(request.id)).toThrow("not approved");
    approvals.approve(request.id, "human-reviewer", "approved for staging gate");
    expect(() => approvals.enforceApproval(request.id)).not.toThrow();
    expect(approvals.getApprovalRequest(request.id)?.status).toBe("APPROVED");
  });
});
