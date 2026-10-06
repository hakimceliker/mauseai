/**
 * Agent Registry Module
 *
 * Central registry for all available agents (human and autonomous).
 * Handles agent discovery, selection, and lifecycle management.
 */

import {
  AgentRole,
  DataScope,
  RiskLevel,
  AgentType,
  validateAgent,
  createAgent as createAgentFromContract,
} from "@/src/core/contracts/agent-contract";
import {
  AgentDefinition,
  AgentMetrics,
  AgentFilterOptions,
} from "@/src/core/agents/agent-definition";
import { getCapabilityRegistry } from "@/src/core/agents/capability-definition";
import { TaskType } from "@/src/core/contracts/task-contract";

/**
 * Agent Registry - Catalog of all available agents
 */
export class AgentRegistry {
  private agents: Map<string, AgentDefinition> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeDefaultAgents();
  }

  /**
   * Register a new agent in the registry
   * - Validates all required fields
   * - Checks ID uniqueness
   * - Stores in registry
   * - Logs registration
   */
  registerAgent(agentData: Omit<AgentType, "id">): AgentDefinition {
    // Validate required fields
    if (!agentData.name || agentData.name.trim() === "") {
      throw new Error("Agent name is required");
    }

    if (!agentData.role) {
      throw new Error("Agent role is required");
    }

    if (!agentData.capability || agentData.capability.length === 0) {
      throw new Error("Agent must have at least one capability");
    }

    if (!agentData.modelPreference || agentData.modelPreference.trim() === "") {
      throw new Error("Agent model preference is required");
    }

    if (!agentData.dataScope) {
      throw new Error("Agent data scope is required");
    }

    if (agentData.timeout === undefined || agentData.timeout <= 0) {
      throw new Error("Agent timeout must be a positive number");
    }

    if (agentData.riskLevel === undefined) {
      throw new Error("Agent risk level is required");
    }

    // Create agent from contract
    const agent = createAgentFromContract(agentData);

    // Check ID uniqueness
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with ID ${agent.id} already exists`);
    }

    // Create extended definition with metrics
    const definition: AgentDefinition = {
      ...agent,
      createdAt: new Date(),
      lastActivity: new Date(),
      successRate: 1.0,
      retryCount: 0,
      totalTasksExecuted: 0,
      totalTasksFailed: 0,
    };

    // Store in registry
    this.agents.set(agent.id, definition);

    console.log(
      `[AgentRegistry] Registered agent: ${agent.name} (${agent.id})`
    );

    return definition;
  }

  /**
   * Query agents by capability
   * - Filter agents with matching capability
   * - Sort by success rate (descending)
   * - Return candidates
   */
  getAgentsByCapability(capability: string): AgentDefinition[] {
    const agents = Array.from(this.agents.values()).filter((agent) =>
      agent.capability.includes(capability)
    );

    // Sort by success rate (descending)
    agents.sort((a, b) => b.successRate - a.successRate);

    return agents;
  }

  /**
   * Query agents by role
   * - Filter agents with matching role
   * - Return list
   */
  getAgentsByRole(role: AgentRole): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((agent) => agent.role === role);
  }

  /**
   * Get agent details by ID
   * - Load agent
   * - Return definition with permissions, limits, fallbacks
   */
  getAgent(agentId: string): AgentDefinition | null {
    return this.agents.get(agentId) || null;
  }

  /**
   * Select the best agent for a task
   * - Determine required capability from task
   * - Get candidates: getAgentsByCapability(capability)
   * - Rank by:
   *   * Capability match (exact vs partial)
   *   * Risk level (task risk vs agent tolerance)
   *   * Success rate (historical)
   *   * Availability
   *   * Cost (prefer cheaper if equally capable)
   * - Return best match
   * - If no match: try fallback capability
   * - If still no match: escalate to HUMAN agent
   */
  selectAgentForTask(task: TaskType): AgentDefinition {
    // For now, we'll use a simple selection based on capability
    // In a real system, this would parse the task description to determine required capability
    // For MVP, we infer from the goal
    let requiredCapability = this.inferCapabilityFromTask(task);

    // Get candidates with exact capability match
    let candidates = this.getAgentsByCapability(requiredCapability);

    // If no exact match, try to find agents with related capabilities
    if (candidates.length === 0) {
      // Try fallback capability based on task type
      const fallbackCapability = this.inferFallbackCapability(requiredCapability);
      if (fallbackCapability) {
        candidates = this.getAgentsByCapability(fallbackCapability);
      }
    }

    // If still no match, escalate to HUMAN agent
    if (candidates.length === 0) {
      const humanAgent = this.getHumanAgent();
      if (humanAgent) {
        console.log(
          `[AgentRegistry] No agents found for capability ${requiredCapability}, escalating to HUMAN`
        );
        return humanAgent;
      }
      throw new Error(
        `No agents available for capability ${requiredCapability} and no HUMAN agent found`
      );
    }

    // Score and rank candidates
    const scored = candidates.map((agent) => ({
      agent,
      score: this.scoreAgent(agent, task),
    }));

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    const selected = scored[0].agent;
    console.log(
      `[AgentRegistry] Selected agent: ${selected.name} (${selected.id}) for task: ${task.id}`
    );

    return selected;
  }

  /**
   * Get the judge for an agent
   * - Load agent
   * - Get designated judge owner
   * - Verify judge != executor
   * - Return judge
   */
  getJudgeForAgent(agentId: string): AgentDefinition {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.judgeOwner) {
      throw new Error(`Agent ${agentId} has no judge owner assigned`);
    }

    const judge = this.getAgent(agent.judgeOwner);
    if (!judge) {
      throw new Error(`Judge ${agent.judgeOwner} not found for agent ${agentId}`);
    }

    // Verify judge != executor
    if (judge.id === agent.id) {
      throw new Error(`Judge cannot be the same as the executor agent`);
    }

    console.log(
      `[AgentRegistry] Judge for agent ${agent.name}: ${judge.name}`
    );

    return judge;
  }

  /**
   * Get fallback agent
   * - Load agent
   * - Get fallback agent ID
   * - Load and return fallback
   * - If none: return HUMAN agent
   */
  getFallbackAgent(agentId: string): AgentDefinition {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.fallbackAgent) {
      const fallback = this.getAgent(agent.fallbackAgent);
      if (fallback) {
        console.log(
          `[AgentRegistry] Fallback for agent ${agent.name}: ${fallback.name}`
        );
        return fallback;
      }
      console.warn(
        `[AgentRegistry] Fallback agent ${agent.fallbackAgent} not found, returning HUMAN`
      );
    }

    // Return HUMAN agent as ultimate fallback
    const humanAgent = this.getHumanAgent();
    if (!humanAgent) {
      throw new Error("HUMAN agent not found in registry");
    }

    return humanAgent;
  }

  /**
   * List all agents with optional filtering
   * - Return all agents matching filter
   * - Used for monitoring, status pages
   */
  listAgents(filter?: AgentFilterOptions): AgentDefinition[] {
    let agents = Array.from(this.agents.values());

    if (filter) {
      if (filter.role) {
        agents = agents.filter((agent) => agent.role === filter.role);
      }

      if (filter.capability) {
        agents = agents.filter((agent) =>
          agent.capability.includes(filter.capability!)
        );
      }

      if (filter.dataScope) {
        agents = agents.filter((agent) => agent.dataScope === filter.dataScope);
      }

      if (filter.riskLevel) {
        agents = agents.filter((agent) => agent.riskLevel === filter.riskLevel);
      }
    }

    return agents;
  }

  /**
   * Update agent metrics (success rate, availability)
   * - Load agent
   * - Update success_rate, last_activity, retry_count
   * - Log update
   */
  updateAgentMetrics(agentId: string, metrics: AgentMetrics): void {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update metrics
    if (metrics.successRate !== undefined) {
      if (metrics.successRate < 0 || metrics.successRate > 1) {
        throw new Error("Success rate must be between 0 and 1");
      }
      agent.successRate = metrics.successRate;
    }

    if (metrics.lastActivity !== undefined) {
      agent.lastActivity = metrics.lastActivity;
    }

    if (metrics.retryCount !== undefined) {
      if (metrics.retryCount < 0) {
        throw new Error("Retry count cannot be negative");
      }
      agent.retryCount = metrics.retryCount;
    }

    if (metrics.totalTasksExecuted !== undefined) {
      if (metrics.totalTasksExecuted < 0) {
        throw new Error("Total tasks executed cannot be negative");
      }
      agent.totalTasksExecuted = metrics.totalTasksExecuted;
    }

    if (metrics.totalTasksFailed !== undefined) {
      if (metrics.totalTasksFailed < 0) {
        throw new Error("Total tasks failed cannot be negative");
      }
      agent.totalTasksFailed = metrics.totalTasksFailed;
    }

    console.log(`[AgentRegistry] Updated metrics for agent: ${agent.name}`);
  }

  /**
   * Helper: Get HUMAN agent
   */
  private getHumanAgent(): AgentDefinition | null {
    const humans = this.getAgentsByRole(AgentRole.HUMAN);
    return humans.length > 0 ? humans[0] : null;
  }

  /**
   * Helper: Score an agent for task assignment
   * Scoring factors:
   * - Risk level match
   * - Success rate (weighted 40%)
   * - Availability (concurrency) (weighted 30%)
   * - Cost preference (weighted 20%)
   * - Recency (weighted 10%)
   */
  private scoreAgent(agent: AgentDefinition, task: TaskType): number {
    let score = 0;

    // Success rate (40%)
    score += agent.successRate * 40;

    // Availability (30%) - higher concurrency limit = higher score
    const availabilityScore = Math.min(agent.concurrencyLimit / 5, 1);
    score += availabilityScore * 30;

    // Recency (10%) - how recently was the agent active
    const now = new Date().getTime();
    const lastActivity = agent.lastActivity.getTime();
    const hoursAgo = (now - lastActivity) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - hoursAgo / 24); // Full score if active in last 24h
    score += recencyScore * 10;

    // Risk level compatibility (weighted in scoring)
    // Agents with matching risk tolerance get a bonus
    if (this.riskLevelCompatible(agent.riskLevel, task)) {
      score += 5;
    }

    return score;
  }

  /**
   * Helper: Check if agent risk level is compatible with task risk
   */
  private riskLevelCompatible(agentRisk: RiskLevel, task: TaskType): boolean {
    // Simple compatibility check - agent risk >= estimated task risk
    // In a real system, you'd parse task to determine risk
    return true; // Placeholder for MVP
  }

  /**
   * Helper: Infer required capability from task
   */
  private inferCapabilityFromTask(task: TaskType): string {
    const goal = task.goal.toLowerCase();

    // Simple heuristics for MVP
    if (
      goal.includes("deploy") ||
      goal.includes("production") ||
      goal.includes("release")
    ) {
      return "deploy";
    } else if (goal.includes("review") || goal.includes("code")) {
      return "code-review";
    } else if (goal.includes("incident") || goal.includes("alert")) {
      return "incident-response";
    } else if (goal.includes("security") || goal.includes("scan")) {
      return "security-review";
    } else if (goal.includes("plan") || goal.includes("estimate")) {
      return "planning";
    } else if (goal.includes("orchestrat")) {
      return "orchestration";
    } else if (goal.includes("verify") || goal.includes("judge")) {
      return "verification";
    } else if (goal.includes("error") || goal.includes("recovery")) {
      return "error-handling";
    } else if (goal.includes("rollback")) {
      return "rollback";
    }

    // Default to planning for unknown tasks
    return "planning";
  }

  /**
   * Helper: Infer fallback capability
   */
  private inferFallbackCapability(capability: string): string | null {
    // Map capabilities to fallbacks
    const fallbackMap: Record<string, string> = {
      deploy: "orchestration",
      "code-review": "planning",
      "incident-response": "error-handling",
      "security-review": "code-review",
      planning: "orchestration",
      orchestration: "planning",
      verification: "error-handling",
      "error-handling": "recovery",
      rollback: "incident-response",
      infrastructure: "deploy",
    };

    return fallbackMap[capability] || null;
  }

  /**
   * Initialize the registry with default agents
   */
  private initializeDefaultAgents(): void {
    if (this.initialized) {
      return;
    }

    try {
      // First pass: Register all agents without setting cross-references
      const orchestrator = this.registerAgent({
        name: "ORCHESTRATOR",
        role: AgentRole.ORCHESTRATOR,
        capability: ["orchestration", "dependency-resolution"],
        toolAllowlist: [
          "agent-registry",
          "task-manager",
          "execution-monitor",
          "evidence-gate",
        ],
        modelPreference: "claude-opus-5",
        dataScope: DataScope.SYSTEM,
        readPermission: true,
        writePermission: true,
        riskLevel: RiskLevel.CRITICAL,
        timeout: 300,
        concurrencyLimit: 10,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Master orchestrator for multi-agent workflows",
      });

      const planner = this.registerAgent({
        name: "PLANNER",
        role: AgentRole.PLANNER,
        capability: ["planning", "cost-estimation"],
        toolAllowlist: ["llm-api", "cost-calculator", "dependency-analyzer"],
        modelPreference: "claude-sonnet-4",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.MEDIUM,
        timeout: 120,
        concurrencyLimit: 5,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Plan and decompose goals into executable tasks",
      });

      const codeReviewer = this.registerAgent({
        name: "CODE_REVIEWER",
        role: AgentRole.SPECIALIST,
        capability: ["code-review", "security-review"],
        toolAllowlist: ["github-api", "code-analyzer", "linter"],
        modelPreference: "claude-sonnet-4",
        dataScope: DataScope.WORKSPACE,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.MEDIUM,
        timeout: 180,
        concurrencyLimit: 3,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Code review and security analysis specialist",
      });

      const deployer = this.registerAgent({
        name: "DEPLOYER",
        role: AgentRole.SPECIALIST,
        capability: ["deploy", "infrastructure"],
        toolAllowlist: [
          "vercel-api",
          "github-api",
          "docker",
          "monitoring",
          "rollback-tools",
        ],
        modelPreference: "claude-opus-5",
        dataScope: DataScope.SYSTEM,
        readPermission: true,
        writePermission: true,
        riskLevel: RiskLevel.CRITICAL,
        timeout: 600,
        concurrencyLimit: 1,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Manage production deployments and infrastructure",
      });

      const incidentResponder = this.registerAgent({
        name: "INCIDENT_RESPONDER",
        role: AgentRole.SPECIALIST,
        capability: ["incident-response", "rollback", "error-handling"],
        toolAllowlist: [
          "monitoring",
          "deployment",
          "communication",
          "logs",
          "metrics",
        ],
        modelPreference: "claude-opus-5",
        dataScope: DataScope.SYSTEM,
        readPermission: true,
        writePermission: true,
        riskLevel: RiskLevel.CRITICAL,
        timeout: 300,
        concurrencyLimit: 2,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Incident response and emergency recovery",
      });

      const judge = this.registerAgent({
        name: "JUDGE",
        role: AgentRole.JUDGE,
        capability: ["verification", "evidence-assessment"],
        toolAllowlist: ["evidence-gate", "criteria-checker", "test-runner"],
        modelPreference: "claude-opus-5",
        dataScope: DataScope.SYSTEM,
        readPermission: true,
        writePermission: false,
        riskLevel: RiskLevel.CRITICAL,
        timeout: 180,
        concurrencyLimit: 5,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Independent verification and evidence assessment",
      });

      const human = this.registerAgent({
        name: "HUMAN",
        role: AgentRole.HUMAN,
        capability: ["decision-making", "approval", "escalation"],
        toolAllowlist: ["communication", "monitoring"],
        modelPreference: "human",
        dataScope: DataScope.TENANT_ISOLATED,
        readPermission: true,
        writePermission: true,
        riskLevel: RiskLevel.LOW,
        timeout: 3600,
        concurrencyLimit: 1,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Human user - final decision maker",
      });

      const recovery = this.registerAgent({
        name: "RECOVERY",
        role: AgentRole.SPECIALIST,
        capability: ["error-handling", "rollback", "retry"],
        toolAllowlist: [
          "monitoring",
          "deployment",
          "recovery-tools",
          "task-manager",
        ],
        modelPreference: "claude-sonnet-4",
        dataScope: DataScope.SYSTEM,
        readPermission: true,
        writePermission: true,
        riskLevel: RiskLevel.HIGH,
        timeout: 300,
        concurrencyLimit: 3,
        fallbackAgent: undefined,
        judgeOwner: undefined,
        description: "Error recovery and retry management",
      });

      // Second pass: Set cross-references now that all agents exist
      orchestrator.judgeOwner = human.id;
      planner.judgeOwner = orchestrator.id;
      codeReviewer.judgeOwner = human.id;
      deployer.judgeOwner = human.id;
      incidentResponder.judgeOwner = human.id;
      judge.judgeOwner = human.id;
      recovery.fallbackAgent = human.id;
      recovery.judgeOwner = human.id;

      this.initialized = true;
      console.log(
        `[AgentRegistry] Initialized with ${this.agents.size} default agents`
      );
    } catch (error) {
      console.error("[AgentRegistry] Failed to initialize default agents:", error);
      throw error;
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    agentsByRole: Record<string, number>;
    agentsByCapability: Record<string, number>;
  } {
    const stats = {
      totalAgents: this.agents.size,
      agentsByRole: {} as Record<string, number>,
      agentsByCapability: {} as Record<string, number>,
    };

    // Count by role
    for (const agent of this.agents.values()) {
      stats.agentsByRole[agent.role] = (stats.agentsByRole[agent.role] || 0) + 1;
    }

    // Count by capability
    for (const agent of this.agents.values()) {
      for (const cap of agent.capability) {
        stats.agentsByCapability[cap] =
          (stats.agentsByCapability[cap] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Singleton instance of the agent registry
 */
let agentRegistry: AgentRegistry | null = null;

/**
 * Get or create the global agent registry
 */
export function getAgentRegistry(): AgentRegistry {
  if (!agentRegistry) {
    agentRegistry = new AgentRegistry();
  }
  return agentRegistry;
}

/**
 * Reset agent registry (useful for testing)
 */
export function resetAgentRegistry(): void {
  agentRegistry = null;
}
