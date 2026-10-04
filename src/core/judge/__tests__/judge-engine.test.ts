/**
 * Judge Engine Tests
 * B8 Phase - Testing 10 criteria validator
 */

import { JudgeEngine } from "../judge-engine";
import { TaskContext, Evidence } from "../types";

describe("JudgeEngine", () => {
  let engine: JudgeEngine;

  beforeEach(() => {
    engine = new JudgeEngine();
  });

  describe("judge() method", () => {
    it("should return PASS when all criteria are met", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: [],
        productionProof: {
          url: "https://example.com/proof",
          timestamp: new Date(),
          verified: true,
        },
      };

      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed successfully",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "All tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.status).toBe("PASS");
      expect(judgment.canClose).toBe(true);
      expect(judgment.criteria.branchCorrect).toBe(true);
      expect(judgment.criteria.shaUpdated).toBe(true);
    });

    it("should return FAIL when branch is incorrect", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "wrong-branch",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test"
      );

      expect(judgment.status).toBe("FAIL");
      expect(judgment.canClose).toBe(false);
      expect(judgment.criteria.branchCorrect).toBe(false);
      expect(judgment.failureReasons).toContain("Branch is not correct");
    });

    it("should return FAIL when CI did not pass", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "failed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.ciPassed).toBe(false);
      expect(judgment.failureReasons).toContain("CI pipeline did not pass");
    });

    it("should validate judge not equal to executor", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-1"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      // Judge is same as executor
      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-1", // Same as executor
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.judgeNotExecutor).toBe(false);
      expect(judgment.failureReasons).toContain("Judge cannot be the executor");
    });

    it("should check for independent review", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: false,
        approvals: [],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.independentReviewExists).toBe(false);
    });

    it("should validate dependencies are complete", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: ["dep-task-1", "dep-task-2"],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.dependenciesComplete).toBe(true);
    });

    it("should escalate when production proof is missing", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      // Should escalate due to missing production proof
      expect(judgment.criteria.productionProofReal).toBe(false);
    });
  });

  describe("policy management", () => {
    it("should list available policies", () => {
      const policies = engine.listPolicies();
      expect(policies.length).toBeGreaterThan(0);
      expect(policies.some((p) => p.name === "default")).toBe(true);
      expect(policies.some((p) => p.name === "strict")).toBe(true);
    });

    it("should register custom policy", () => {
      const customPolicy = {
        name: "custom",
        description: "Custom test policy",
        requiredCriteria: ["branchCorrect", "shaUpdated"],
        requiresHumanApproval: false,
        autoEscalate: [] as const,
      };

      engine.registerPolicy(customPolicy);
      const policy = engine.getPolicy("custom");

      expect(policy).toBeDefined();
      expect(policy?.name).toBe("custom");
    });

    it("should retrieve policy by name", () => {
      const policy = engine.getPolicy("strict");
      expect(policy).toBeDefined();
      expect(policy?.requiredCriteria.length).toBe(10);
    });
  });

  describe("validation criteria", () => {
    it("should validate SHA format", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "invalid-sha",
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "invalid-sha"
      );

      expect(judgment.criteria.shaUpdated).toBe(false);
    });

    it("should validate human approval", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: ["user-2", "user-3"],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.humanApprovalProvided).toBe(true);
    });

    it("should handle missing approvals", async () => {
      const context: TaskContext = {
        taskId: "task-1",
        executorId: "user-1",
        branch: "feature/test",
        sha: "a".repeat(40),
        ciStatus: "passed",
        testStatus: "passed",
        hasIndependentReview: true,
        approvals: [],
        dependencies: [],
        productionProof: undefined,
      };

      const evidence: Evidence[] = [];

      const judgment = await engine.judge(
        "task-1",
        context,
        evidence,
        "user-2",
        "feature/test",
        "a".repeat(40)
      );

      expect(judgment.criteria.humanApprovalProvided).toBe(false);
    });
  });
});
