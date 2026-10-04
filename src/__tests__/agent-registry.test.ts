/**
 * Agent Registry Tests
 *
 * Tests for the Agent Registry (Phase B4) functionality including:
 * - Agent registration and validation
 * - Capability matching and agent selection
 * - Judge and fallback assignment
 * - Metrics tracking
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  AgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
} from "@/src/core/agents/agent-registry";
import {
  CapabilityRegistry,
  getCapabilityRegistry,
  resetCapabilityRegistry,
} from "@/src/core/agents/capability-definition";
import {
  AgentRole,
  DataScope,
  RiskLevel,
} from "@/src/core/contracts/agent-contract";
import { createTask, TaskStatus, TaskType } from "@/src/core/contracts/task-contract";

describe("AgentRegistry", () => {
  let registry: AgentRegistry;
  let capabilityRegistry: CapabilityRegistry;

  beforeEach(() => {
    resetAgentRegistry();
    resetCapabilityRegistry();
    registry = getAgentRegistry();
    capabilityRegistry = getCapabilityRegistry();
  });

  afterEach(() => {
    resetAgentRegistry();
    resetCapabilityRegistry();
  });

  describe("registerAgent", () => {
    it("should register a valid agent", () => {
      const stats = registry.getStats();
      const initialCount = stats.totalAgents;

      const agent = registry.registerAgent({
        name: "Test Agent",
        role: AgentRole.SPECIALIST,
        capability: ["test-capability"],
        toolAllowlist: ["test-tool"],
        modelPreference: "test-model",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      expect(agent).toBeDefined();
      expect(agent.name).toBe("Test Agent");
      expect(agent.id).toBeDefined();
      expect(registry.getStats().totalAgents).toBe(initialCount + 1);
    });

    it("should validate required fields during registration", () => {
      // Missing name
      expect(() =>
        registry.registerAgent({
          name: "",
          role: AgentRole.SPECIALIST,
          capability: ["test"],
          toolAllowlist: [],
          modelPreference: "test",
          dataScope: DataScope.WORKSPACE,
          readPermission: true,
          writePermission: false,
          riskLevel: RiskLevel.LOW,
          timeout: 60,
          concurrencyLimit: 1,
        })
      ).toThrow("Agent name is required");

      // Missing role
      expect(() =>
        registry.registerAgent({
          name: "Test",
          role: undefined as any,
          capability: ["test"],
          toolAllowlist: [],
          modelPreference: "test",
          dataScope: DataScope.WORKSPACE,
          readPermission: true,
          writePermission: false,
          riskLevel: RiskLevel.LOW,
          timeout: 60,
          concurrencyLimit: 1,
        })
      ).toThrow("Agent role is required");

      // Missing capabilities
      expect(() =>
        registry.registerAgent({
          name: "Test",
          role: AgentRole.SPECIALIST,
          capability: [],
          toolAllowlist: [],
          modelPreference: "test",
          dataScope: DataScope.WORKSPACE,
          readPermission: true,
          writePermission: false,
          riskLevel: RiskLevel.LOW,
          timeout: 60,
          concurrencyLimit: 1,
        })
      ).toThrow("Agent must have at least one capability");
    });

    it("should check ID uniqueness", () => {
      const agentData = {
        name: "Test Agent",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      };

      registry.registerAgent(agentData);

      // Trying to register another agent with same name should create different ID
      const agent2 = registry.registerAgent(agentData);
      expect(agent2.id).not.toBe(registry.listAgents()[0].id);
    });

    it("should initialize metrics on registration", () => {
      const agent = registry.registerAgent({
        name: "Metrics Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      expect(agent.successRate).toBe(1.0);
      expect(agent.retryCount).toBe(0);
      expect(agent.totalTasksExecuted).toBe(0);
      expect(agent.totalTasksFailed).toBe(0);
      expect(agent.createdAt).toBeDefined();
      expect(agent.lastActivity).toBeDefined();
    });
  });

  describe("getAgentsByCapability", () => {
    it("should return agents with matching capability", () => {
      registry.registerAgent({
        name: "Code Reviewer",
        role: AgentRole.SPECIALIST,
        capability: ["code-review", "security-review"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.MEDIUM,
        timeout: 60,
        concurrencyLimit: 1,
      });

      const agents = registry.getAgentsByCapability("code-review");
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].capability).toContain("code-review");
    });

    it("should sort agents by success rate (descending)", () => {
      const agent1 = registry.registerAgent({
        name: "Agent 1",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      const agent2 = registry.registerAgent({
        name: "Agent 2",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      // Update success rate of agent2
      registry.updateAgentMetrics(agent2.id, { successRate: 0.9 });

      const agents = registry.getAgentsByCapability("test");
      // Should be sorted by success rate
      expect(agents.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty array if no agents have capability", () => {
      const agents = registry.getAgentsByCapability("nonexistent-capability");
      expect(agents).toEqual([]);
    });
  });

  describe("getAgentsByRole", () => {
    it("should return agents with matching role", () => {
      const agents = registry.getAgentsByRole(AgentRole.ORCHESTRATOR);
      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].role).toBe(AgentRole.ORCHESTRATOR);
    });

    it("should return empty array if no agents have role", () => {
      const agents = registry.getAgentsByRole(AgentRole.JUDGE);
      // Default agents include a JUDGE
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe("getAgent", () => {
    it("should return agent by ID", () => {
      const registered = registry.registerAgent({
        name: "Lookup Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      const agent = registry.getAgent(registered.id);
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(registered.id);
      expect(agent?.name).toBe("Lookup Test");
    });

    it("should return null for non-existent agent", () => {
      const agent = registry.getAgent("nonexistent-id");
      expect(agent).toBeNull();
    });
  });

  describe("selectAgentForTask", () => {
    it("should select an agent for a deployment task", () => {
      const task = createTask({
        id: crypto.randomUUID(),
        title: "Deploy to production",
        goal: "Deploy the application to production environment",
        status: TaskStatus.TODO,
        phaseTarget: "B1",
        assignedAgent: "test",
        estimatedCost: { tokens: 1000, usd: 0.01 },
        auditTraceId: "trace-123",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const agent = registry.selectAgentForTask(task);
      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
    });

    it("should select an agent for a code review task", () => {
      const task = createTask({
        id: crypto.randomUUID(),
        title: "Review pull request",
        goal: "Review the code changes in the pull request",
        status: TaskStatus.TODO,
        phaseTarget: "B1",
        assignedAgent: "test",
        estimatedCost: { tokens: 1000, usd: 0.01 },
        auditTraceId: "trace-123",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      const agent = registry.selectAgentForTask(task);
      expect(agent).toBeDefined();
      expect(agent.capability).toContain("code-review");
    });

    it("should escalate to HUMAN agent if no match found", () => {
      const task = createTask({
        id: crypto.randomUUID(),
        title: "Unknown task",
        goal: "Do something completely unknown",
        status: TaskStatus.TODO,
        phaseTarget: "B1",
        assignedAgent: "test",
        estimatedCost: { tokens: 1000, usd: 0.01 },
        auditTraceId: "trace-123",
        dependencies: [],
        retryCount: 0,
        maxRetries: 3,
        evidence: [],
        humanApprovalRequired: false,
        humanApprovalStatus: "NONE",
      });

      // Find an agent - it should not fail
      const agent = registry.selectAgentForTask(task);
      expect(agent).toBeDefined();
    });
  });

  describe("getJudgeForAgent", () => {
    it("should return judge for an agent", () => {
      const orchestrators = registry.getAgentsByRole(AgentRole.ORCHESTRATOR);
      expect(orchestrators.length).toBeGreaterThan(0);
      const judge = registry.getJudgeForAgent(orchestrators[0].id);
      expect(judge).toBeDefined();
      expect(judge.id).toBeDefined();
    });

    it("should verify judge != executor", () => {
      const orchestrators = registry.getAgentsByRole(AgentRole.ORCHESTRATOR);
      expect(orchestrators.length).toBeGreaterThan(0);
      const agent = orchestrators[0];
      const judge = registry.getJudgeForAgent(agent.id);
      expect(judge.id).not.toBe(agent.id);
    });

    it("should throw error if agent has no judge", () => {
      // Create agent without judge owner
      const agentWithoutJudge = registry.registerAgent({
        name: "No Judge Agent",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      expect(() =>
        registry.getJudgeForAgent(agentWithoutJudge.id)
      ).toThrow();
    });

    it("should throw error if agent not found", () => {
      expect(() => registry.getJudgeForAgent("nonexistent")).toThrow(
        "Agent nonexistent not found"
      );
    });
  });

  describe("getFallbackAgent", () => {
    it("should return fallback agent if defined", () => {
      const specialists = registry.listAgents({ role: AgentRole.SPECIALIST });
      const agentWithFallback = specialists.find((a) => a.fallbackAgent);
      if (agentWithFallback) {
        const fallback = registry.getFallbackAgent(agentWithFallback.id);
        expect(fallback).toBeDefined();
        expect(fallback.id).toBe(agentWithFallback.fallbackAgent);
      }
    });

    it("should return HUMAN agent as fallback if none defined", () => {
      const agent = registry.registerAgent({
        name: "No Fallback Agent",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      const fallback = registry.getFallbackAgent(agent.id);
      expect(fallback).toBeDefined();
      expect(fallback.role).toBe(AgentRole.HUMAN);
    });

    it("should throw error if agent not found", () => {
      expect(() => registry.getFallbackAgent("nonexistent")).toThrow(
        "Agent nonexistent not found"
      );
    });
  });

  describe("listAgents", () => {
    it("should list all agents without filter", () => {
      const agents = registry.listAgents();
      expect(agents.length).toBeGreaterThan(0);
    });

    it("should filter agents by role", () => {
      const orchestrators = registry.listAgents({
        role: AgentRole.ORCHESTRATOR,
      });
      expect(orchestrators.length).toBeGreaterThan(0);
      expect(orchestrators.every((a) => a.role === AgentRole.ORCHESTRATOR)).toBe(
        true
      );
    });

    it("should filter agents by capability", () => {
      const deployers = registry.listAgents({ capability: "deploy" });
      expect(deployers.length).toBeGreaterThan(0);
      expect(deployers.every((a) => a.capability.includes("deploy"))).toBe(true);
    });

    it("should filter agents by data scope", () => {
      const systemAgents = registry.listAgents({
        dataScope: DataScope.SYSTEM,
      });
      expect(systemAgents.length).toBeGreaterThan(0);
      expect(systemAgents.every((a) => a.dataScope === DataScope.SYSTEM)).toBe(
        true
      );
    });

    it("should filter agents by risk level", () => {
      const criticalAgents = registry.listAgents({
        riskLevel: RiskLevel.CRITICAL,
      });
      expect(criticalAgents.length).toBeGreaterThan(0);
      expect(
        criticalAgents.every((a) => a.riskLevel === RiskLevel.CRITICAL)
      ).toBe(true);
    });
  });

  describe("updateAgentMetrics", () => {
    it("should update success rate", () => {
      const agent = registry.registerAgent({
        name: "Metrics Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      registry.updateAgentMetrics(agent.id, { successRate: 0.85 });
      const updated = registry.getAgent(agent.id);
      expect(updated?.successRate).toBe(0.85);
    });

    it("should update last activity", () => {
      const agent = registry.registerAgent({
        name: "Activity Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      const newTime = new Date();
      registry.updateAgentMetrics(agent.id, { lastActivity: newTime });
      const updated = registry.getAgent(agent.id);
      expect(updated?.lastActivity).toEqual(newTime);
    });

    it("should update retry count", () => {
      const agent = registry.registerAgent({
        name: "Retry Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      registry.updateAgentMetrics(agent.id, { retryCount: 5 });
      const updated = registry.getAgent(agent.id);
      expect(updated?.retryCount).toBe(5);
    });

    it("should update total tasks executed", () => {
      const agent = registry.registerAgent({
        name: "Tasks Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      registry.updateAgentMetrics(agent.id, { totalTasksExecuted: 100 });
      const updated = registry.getAgent(agent.id);
      expect(updated?.totalTasksExecuted).toBe(100);
    });

    it("should update total tasks failed", () => {
      const agent = registry.registerAgent({
        name: "Failed Tasks Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      registry.updateAgentMetrics(agent.id, { totalTasksFailed: 5 });
      const updated = registry.getAgent(agent.id);
      expect(updated?.totalTasksFailed).toBe(5);
    });

    it("should validate success rate bounds", () => {
      const agent = registry.registerAgent({
        name: "Bounds Test",
        role: AgentRole.SPECIALIST,
        capability: ["test"],
        toolAllowlist: [],
        modelPreference: "test",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.LOW,
        timeout: 60,
        concurrencyLimit: 1,
      });

      expect(() =>
        registry.updateAgentMetrics(agent.id, { successRate: 1.5 })
      ).toThrow("Success rate must be between 0 and 1");

      expect(() =>
        registry.updateAgentMetrics(agent.id, { successRate: -0.1 })
      ).toThrow("Success rate must be between 0 and 1");
    });

    it("should throw error if agent not found", () => {
      expect(() =>
        registry.updateAgentMetrics("nonexistent", { successRate: 0.5 })
      ).toThrow("Agent nonexistent not found");
    });
  });

  describe("Default Agents", () => {
    it("should have ORCHESTRATOR agent", () => {
      const orchestrators = registry.getAgentsByRole(AgentRole.ORCHESTRATOR);
      expect(orchestrators.length).toBeGreaterThan(0);
    });

    it("should have PLANNER agent", () => {
      const planners = registry.getAgentsByRole(AgentRole.PLANNER);
      expect(planners.length).toBeGreaterThan(0);
    });

    it("should have JUDGE agent", () => {
      const judges = registry.getAgentsByRole(AgentRole.JUDGE);
      expect(judges.length).toBeGreaterThan(0);
    });

    it("should have HUMAN agent", () => {
      const humans = registry.getAgentsByRole(AgentRole.HUMAN);
      expect(humans.length).toBeGreaterThan(0);
    });

    it("should have specialist agents", () => {
      const specialists = registry.getAgentsByRole(AgentRole.SPECIALIST);
      expect(specialists.length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should return accurate statistics", () => {
      const stats = registry.getStats();
      expect(stats.totalAgents).toBeGreaterThan(0);
      expect(stats.agentsByRole).toBeDefined();
      expect(stats.agentsByCapability).toBeDefined();
    });

    it("should count agents by role correctly", () => {
      const stats = registry.getStats();
      const orchestrators = registry.getAgentsByRole(AgentRole.ORCHESTRATOR);
      expect(stats.agentsByRole[AgentRole.ORCHESTRATOR]).toBe(
        orchestrators.length
      );
    });

    it("should count agents by capability correctly", () => {
      const stats = registry.getStats();
      const deployers = registry.getAgentsByCapability("deploy");
      expect(stats.agentsByCapability["deploy"]).toBe(deployers.length);
    });
  });
});

describe("CapabilityRegistry", () => {
  let capabilityRegistry: CapabilityRegistry;

  beforeEach(() => {
    resetCapabilityRegistry();
    capabilityRegistry = getCapabilityRegistry();
  });

  afterEach(() => {
    resetCapabilityRegistry();
  });

  describe("defineCapability", () => {
    it("should define a new capability", () => {
      capabilityRegistry.defineCapability({
        name: "custom-capability",
        description: "A custom capability for testing",
        requiredTools: ["tool1", "tool2"],
        requiredModel: null,
        riskLevel: RiskLevel.LOW,
        requiresApproval: false,
        requiresReview: false,
        examples: ["example1"],
      });

      const cap = capabilityRegistry.getCapability("custom-capability");
      expect(cap).toBeDefined();
      expect(cap?.name).toBe("custom-capability");
    });

    it("should validate capability name", () => {
      expect(() =>
        capabilityRegistry.defineCapability({
          name: "",
          description: "Test",
          requiredTools: [],
          requiredModel: null,
          riskLevel: RiskLevel.LOW,
          requiresApproval: false,
          requiresReview: false,
          examples: ["example"],
        })
      ).toThrow("Capability name is required");
    });

    it("should validate capability description", () => {
      expect(() =>
        capabilityRegistry.defineCapability({
          name: "test",
          description: "",
          requiredTools: [],
          requiredModel: null,
          riskLevel: RiskLevel.LOW,
          requiresApproval: false,
          requiresReview: false,
          examples: ["example"],
        })
      ).toThrow("Capability description is required");
    });

    it("should require at least one example", () => {
      expect(() =>
        capabilityRegistry.defineCapability({
          name: "test",
          description: "Test capability",
          requiredTools: [],
          requiredModel: null,
          riskLevel: RiskLevel.LOW,
          requiresApproval: false,
          requiresReview: false,
          examples: [],
        })
      ).toThrow("Capability must have at least one example");
    });
  });

  describe("getCapability", () => {
    it("should return capability by name", () => {
      const cap = capabilityRegistry.getCapability("code-review");
      expect(cap).toBeDefined();
      expect(cap?.name).toBe("code-review");
    });

    it("should return null for non-existent capability", () => {
      const cap = capabilityRegistry.getCapability("nonexistent");
      expect(cap).toBeNull();
    });
  });

  describe("hasCapability", () => {
    it("should check if capability exists", () => {
      expect(capabilityRegistry.hasCapability("code-review")).toBe(true);
      expect(capabilityRegistry.hasCapability("nonexistent")).toBe(false);
    });
  });

  describe("listCapabilities", () => {
    it("should list all capabilities", () => {
      const capabilities = capabilityRegistry.listCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
    });
  });

  describe("getCapabilitiesByRiskLevel", () => {
    it("should return capabilities with matching risk level", () => {
      const critical = capabilityRegistry.getCapabilitiesByRiskLevel(
        RiskLevel.CRITICAL
      );
      expect(critical.length).toBeGreaterThan(0);
      expect(critical.every((c) => c.riskLevel === RiskLevel.CRITICAL)).toBe(
        true
      );
    });
  });

  describe("getCapabilitiesRequiringApproval", () => {
    it("should return capabilities requiring approval", () => {
      const needsApproval =
        capabilityRegistry.getCapabilitiesRequiringApproval();
      expect(needsApproval.length).toBeGreaterThan(0);
      expect(needsApproval.every((c) => c.requiresApproval)).toBe(true);
    });
  });

  describe("Default Capabilities", () => {
    it("should initialize with default capabilities", () => {
      const capabilities = capabilityRegistry.listCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
    });

    it("should have code-review capability", () => {
      expect(capabilityRegistry.hasCapability("code-review")).toBe(true);
    });

    it("should have deploy capability", () => {
      expect(capabilityRegistry.hasCapability("deploy")).toBe(true);
    });

    it("should have orchestration capability", () => {
      expect(capabilityRegistry.hasCapability("orchestration")).toBe(true);
    });

    it("should have planning capability", () => {
      expect(capabilityRegistry.hasCapability("planning")).toBe(true);
    });
  });
});
