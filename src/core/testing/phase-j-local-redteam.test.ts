import { describe, expect, it } from "vitest";
import {
  ApprovalRequiredFor,
  ApprovalStatus,
  createApproval,
  rejectRequest,
  validateApprovalProceed,
} from "@/src/core/contracts/approval-contract";
import {
  EvidenceType,
  createEvidence,
  validateEvidenceSufficiency,
} from "@/src/core/contracts/evidence-contract";
import {
  CostProvider,
  createCost,
  validateBudgetConstraint,
} from "@/src/core/contracts/cost-contract";
import { DependencyGraph } from "@/src/core/planner/dependency-graph";
import { PermissionEngine, PermissionLevel, ToolCategory } from "@/src/core/permissions/permission-engine";
import { AppendOnlyEvidenceStore } from "@/src/core/evidence/append-only-evidence-store";
import { TenantAccessDeniedError, TenantIsolationGuard } from "@/src/core/tenancy/tenant-isolation";
import { StateMachine } from "@/src/core/task-engine/state-machine";
import { TaskStatus, createTask } from "@/src/core/contracts/task-contract";
import { ApprovalAuditSystem, AuditEventType } from "@/src/core/approval/approval-audit";
import { ProviderHealth, HealthStatus } from "@/src/core/routing/provider-health";
import { ModelProvider } from "@/src/core/routing/model-router";
import { ErrorClassification, RecoveryAction, RecoveryEngine } from "@/src/core/recovery";
import { redactTelemetry } from "@/src/lib/observability";

const task = (status: TaskStatus = TaskStatus.WORKING) => createTask({
  id: crypto.randomUUID(),
  title: "red-team local contract",
  goal: "verify defensive boundary",
  status,
  phaseTarget: "J",
  dependencies: [],
  assignedAgent: "agent-a",
  estimatedCost: { tokens: 10, usd: 0.01 },
  evidence: [],
  humanApprovalRequired: false,
  humanApprovalStatus: "NONE",
  auditTraceId: "trace-red-team",
});

describe("Phase J — executable local red-team contracts", () => {
  it("scenario 6/10: permission boundaries deny unknown tools and insufficient levels", () => {
    const engine = new PermissionEngine();
    engine.registerAgent("agent", "limited", PermissionLevel.READ, ["read"]);
    engine.registerTool({
      toolId: "write", toolName: "write", category: ToolCategory.FILE_SYSTEM,
      requiredLevel: PermissionLevel.WRITE, requiresApproval: false, riskLevel: "HIGH", description: "write",
    });
    expect(engine.checkPermission({ agentId: "missing", toolId: "write", operation: "write", timestamp: new Date() }).allowed).toBe(false);
    expect(engine.checkPermission({ agentId: "agent", toolId: "write", operation: "write", timestamp: new Date() }).reason).toBe("TOOL_NOT_ALLOWED");
  });

  it("scenario 9: tenant isolation denies cross-tenant access", () => {
    const guard = new TenantIsolationGuard("tenant-a");
    expect(guard.filter([{ tenantId: "tenant-a", id: 1 }, { tenantId: "tenant-b", id: 2 }])).toEqual([{ tenantId: "tenant-a", id: 1 }]);
    expect(() => guard.assertAccess({ tenantId: "tenant-b" })).toThrow(TenantAccessDeniedError);
  });

  it("scenario 11: evidence is append-only from the runtime boundary", () => {
    const store = new AppendOnlyEvidenceStore();
    store.append("task", { id: "e1", type: "TEST_RESULT", content: "pass" });
    const snapshot = store.list("task");
    snapshot[0].content = "tampered";
    expect(store.list("task")[0].content).toBe("pass");
    expect(store.has("task", "e1")).toBe(true);
  });

  it("scenario 12: CLOSED is terminal and cannot be rolled back", () => {
    const closed = task(TaskStatus.CLOSED);
    expect(StateMachine.validateTransition(TaskStatus.CLOSED, TaskStatus.WORKING, closed).allowed).toBe(false);
  });

  it("scenario 13/35: approval audit chains and mandatory rejection reasons are enforced", () => {
    const approval = createApproval({
      taskId: crypto.randomUUID(), requiredFor: ApprovalRequiredFor.PAYMENT,
      requesterAgent: "agent", approverHuman: "owner", approvalStatus: ApprovalStatus.PENDING,
      failIfNotApproved: true,
    });
    expect(() => validateApprovalProceed(approval)).toThrow();
    expect(() => rejectRequest(approval, "")).toThrow("Rejection reason is required");
    const audit = new ApprovalAuditSystem();
    audit.recordEvent(approval.id, AuditEventType.APPROVAL_REQUESTED, "agent");
    audit.recordEvent(approval.id, AuditEventType.APPROVAL_REJECTED, "owner");
    expect(audit.verifyChainIntegrity(audit.getAllEntries())).toBe(true);
  });

  it("scenario 14/36: cost validation rejects budget overflow", () => {
    const cost = createCost({ taskId: crypto.randomUUID(), provider: CostProvider.LOCAL_OLLAMA, model: "qwen", tokenCount: 10, costUsd: 0, costBreakdown: { input: 0, output: 0, other: 0 }, totalTaskCost: 8, budgetRemaining: 2, budgetLimit: 10, budgetAlertTriggered: true });
    expect(cost.budgetAlertTriggered).toBe(true);
    expect(() => validateBudgetConstraint(8, 3, 10)).toThrow(/Budget exceeded/);
  });

  it("scenario 26: dependency graph rejects cycles", () => {
    const graph = new DependencyGraph();
    const a = task(); const b = task();
    graph.addTask(a); graph.addTask(b);
    graph.addDependency(a.id, b.id); graph.addDependency(b.id, a.id);
    expect(graph.detectCycles()).not.toBeNull();
  });

  it("scenario 30: production evidence requirements fail closed when incomplete", () => {
    const evidence = [createEvidence({ taskId: crypto.randomUUID(), type: EvidenceType.TEST_RESULT, filePath: "test.log", sha: "a".repeat(40), redacted: false })];
    expect(() => validateEvidenceSufficiency(evidence, "K")).toThrow(/DEPLOYMENT_LOG/);
  });

  it("scenario 17: provider health transitions down after consecutive failures", () => {
    const health = new ProviderHealth();
    health.recordFailure(ModelProvider.OLLAMA_LOCAL, "service unavailable");
    health.recordFailure(ModelProvider.OLLAMA_LOCAL, "service unavailable");
    health.recordFailure(ModelProvider.OLLAMA_LOCAL, "service unavailable");
    expect(health.getMetrics(ModelProvider.OLLAMA_LOCAL)?.status).toBe(HealthStatus.DOWN);
  });

  it("scenario 32/33: recovery classifies provider failures and conflicts remain explicit", async () => {
    const engine = new RecoveryEngine({ maxRetries: 0 });
    const result = await engine.classifyError({ taskId: crypto.randomUUID(), error: new Error("provider service unavailable"), timestamp: new Date() });
    expect(result.classification).toBe(ErrorClassification.PROVIDER_FAILURE);
    expect(result.suggestedAction).toBe(RecoveryAction.FALLBACK_PROVIDER);
  });

  it("scenario 34: telemetry redacts credential-shaped fields", () => {
    expect(redactTelemetry({ api_key: "secret-value", nested: { token: "abc" } })).toEqual({ api_key: "[REDACTED]", nested: { token: "[REDACTED]" } });
  });
});
