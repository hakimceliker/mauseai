/**
 * Capability Router - Routes tasks to appropriate agents based on capabilities
 * Evaluates: task type, privacy level, risk level, cost constraints, latency requirements
 */

import { RiskLevel } from '@/src/types/enums';

/**
 * Privacy classification for tasks
 */
export enum PrivacyLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  TOP_SECRET = 'top_secret',
}

/**
 * Cost tier for budget constraints
 */
export enum CostTier {
  ULTRA_LOW = 'ultra_low',      // < $0.001
  LOW = 'low',                  // $0.001 - $0.01
  MEDIUM = 'medium',            // $0.01 - $0.10
  HIGH = 'high',                // $0.10 - $1.00
  PREMIUM = 'premium',          // > $1.00
}

/**
 * Latency requirement classification
 */
export enum LatencyTier {
  REALTIME = 'realtime',        // < 100ms
  INTERACTIVE = 'interactive',  // 100ms - 1s
  RESPONSIVE = 'responsive',    // 1s - 5s
  STANDARD = 'standard',        // 5s - 30s
  BATCH = 'batch',              // > 30s
}

/**
 * Task type classification
 */
export enum TaskType {
  CODE_GENERATION = 'code_generation',
  TEXT_ANALYSIS = 'text_analysis',
  DATA_PROCESSING = 'data_processing',
  REASONING = 'reasoning',
  CLASSIFICATION = 'classification',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  CREATIVE = 'creative',
  CUSTOM = 'custom',
}

/**
 * Agent capability profile
 */
export interface AgentCapability {
  id: string;
  name: string;
  type: string;
  supportedTaskTypes: TaskType[];
  minPrivacyLevel: PrivacyLevel;
  supportedRiskLevels: RiskLevel[];
  minLatency: LatencyTier;
  maxCostPerCall: number; // in cents
  costPerToken?: number; // in cents
  provider: string;
  version: string;
  tags: string[];
  maxTokens?: number;
  specializations?: string[];
  requiresHumanApproval: boolean;
  enabled: boolean;
  rateLimitPerMinute?: number;
}

/**
 * Task routing requirements
 */
export interface RoutingTask {
  id: string;
  type: TaskType;
  privacyLevel: PrivacyLevel;
  riskLevel: RiskLevel;
  maxCostCents?: number;
  latencyRequirement: LatencyTier;
  estimatedTokens?: number;
  tenantId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Routing result
 */
export interface RoutingResult {
  selectedAgents: AgentCapability[];
  score: number;
  reasoning: string;
  alternatives?: AgentCapability[];
  requiresApproval: boolean;
}

/**
 * Capability Router implementation
 */
export class CapabilityRouter {
  private agents: Map<string, AgentCapability>;
  private privacyHierarchy = [
    PrivacyLevel.PUBLIC,
    PrivacyLevel.INTERNAL,
    PrivacyLevel.CONFIDENTIAL,
    PrivacyLevel.TOP_SECRET,
  ];
  private costTierValues = {
    [CostTier.ULTRA_LOW]: 0.001,
    [CostTier.LOW]: 0.01,
    [CostTier.MEDIUM]: 0.10,
    [CostTier.HIGH]: 1.00,
    [CostTier.PREMIUM]: Infinity,
  };
  private latencyValues = {
    [LatencyTier.REALTIME]: 100,
    [LatencyTier.INTERACTIVE]: 1000,
    [LatencyTier.RESPONSIVE]: 5000,
    [LatencyTier.STANDARD]: 30000,
    [LatencyTier.BATCH]: Infinity,
  };

  constructor(agents: AgentCapability[] = []) {
    this.agents = new Map(agents.map(a => [a.id, a]));
  }

  /**
   * Register a new agent capability
   */
  registerAgent(agent: AgentCapability): void {
    if (!agent.enabled) {
      this.agents.delete(agent.id);
      return;
    }
    this.agents.set(agent.id, agent);
  }

  /**
   * Unregister an agent capability
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Get all registered agents
   */
  getAgents(): AgentCapability[] {
    return Array.from(this.agents.values()).filter(a => a.enabled);
  }

  /**
   * Route task to capable agents
   */
  routeByCapability(task: RoutingTask): RoutingResult {
    const candidates = this.findCandidates(task);

    if (candidates.length === 0) {
      return {
        selectedAgents: [],
        score: 0,
        reasoning: `No agents found capable of handling ${task.type} task with ${task.privacyLevel} privacy and ${task.riskLevel} risk level`,
        requiresApproval: true,
      };
    }

    // Score and rank candidates
    const scored = candidates.map(agent => ({
      agent,
      score: this.scoreAgent(agent, task),
    }));

    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 4);
    const requiresApproval = best.agent.requiresHumanApproval;

    return {
      selectedAgents: [best.agent],
      score: best.score,
      reasoning: this.buildReasoning(best.agent, task, best.score),
      alternatives: alternatives.map(s => s.agent),
      requiresApproval,
    };
  }

  /**
   * Find candidate agents for task
   */
  private findCandidates(task: RoutingTask): AgentCapability[] {
    return this.getAgents().filter(agent => {
      // Check task type support
      if (!agent.supportedTaskTypes.includes(task.type)) {
        return false;
      }

      // Check privacy level compatibility
      const agentPrivacyIndex = this.privacyHierarchy.indexOf(agent.minPrivacyLevel);
      const taskPrivacyIndex = this.privacyHierarchy.indexOf(task.privacyLevel);
      if (taskPrivacyIndex < agentPrivacyIndex) {
        return false;
      }

      // Check risk level support
      if (!agent.supportedRiskLevels.includes(task.riskLevel)) {
        return false;
      }

      // Check latency capability
      if (this.latencyValues[agent.minLatency] > this.latencyValues[task.latencyRequirement]) {
        return false;
      }

      // Check cost constraint
      if (task.maxCostCents !== undefined) {
        const estimatedCost = this.estimateCost(agent, task);
        if (estimatedCost > task.maxCostCents) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Score an agent for a given task
   */
  private scoreAgent(agent: AgentCapability, task: RoutingTask): number {
    let score = 0;

    // Task type match (0-30 points)
    if (agent.supportedTaskTypes.includes(task.type)) {
      const isSpecialized = agent.specializations?.includes(task.type);
      score += isSpecialized ? 30 : 20;
    }

    // Privacy level match (0-20 points) - exact match preferred
    const agentPrivacyIndex = this.privacyHierarchy.indexOf(agent.minPrivacyLevel);
    const taskPrivacyIndex = this.privacyHierarchy.indexOf(task.privacyLevel);
    const privacyDiff = Math.abs(agentPrivacyIndex - taskPrivacyIndex);
    score += Math.max(0, 20 - privacyDiff * 5);

    // Latency match (0-20 points) - faster is better
    const agentLatency = this.latencyValues[agent.minLatency];
    const taskLatency = this.latencyValues[task.latencyRequirement];
    if (agentLatency <= taskLatency) {
      score += 20 - (Math.log(agentLatency + 1) - Math.log(taskLatency + 1)) * 5;
    }

    // Cost efficiency (0-15 points) - cheaper is better
    if (task.maxCostCents !== undefined && task.estimatedTokens !== undefined) {
      const estimatedCost = this.estimateCost(agent, task);
      const costRatio = estimatedCost / task.maxCostCents;
      if (costRatio < 1) {
        score += 15 * (1 - costRatio);
      }
    }

    // Risk level handling (0-15 points)
    const riskScore = this.scoreRiskHandling(agent, task);
    score += riskScore;

    // Tags matching (bonus 0-5 points)
    if (task.metadata?.tags && Array.isArray(task.metadata.tags)) {
      const matchingTags = task.metadata.tags.filter(tag =>
        agent.tags.includes(tag),
      );
      score += Math.min(5, matchingTags.length);
    }

    return score;
  }

  /**
   * Score risk handling capability
   */
  private scoreRiskHandling(agent: AgentCapability, task: RoutingTask): number {
    const riskMap: Record<RiskLevel, number> = {
      [RiskLevel.L1]: 5,
      [RiskLevel.L2]: 10,
      [RiskLevel.L3]: 13,
      [RiskLevel.L4]: 15,
    };

    if (agent.supportedRiskLevels.includes(task.riskLevel)) {
      return riskMap[task.riskLevel] || 5;
    }

    return 0;
  }

  /**
   * Estimate cost for agent executing task
   */
  private estimateCost(agent: AgentCapability, task: RoutingTask): number {
    if (!task.estimatedTokens) {
      return agent.maxCostPerCall || 0;
    }

    if (agent.costPerToken) {
      return task.estimatedTokens * agent.costPerToken;
    }

    return agent.maxCostPerCall || 0;
  }

  /**
   * Build routing reasoning explanation
   */
  private buildReasoning(
    agent: AgentCapability,
    task: RoutingTask,
    score: number,
  ): string {
    const reasons: string[] = [];

    if (agent.supportedTaskTypes.includes(task.type)) {
      const isSpecialized = agent.specializations?.includes(task.type);
      reasons.push(
        `Agent is ${isSpecialized ? 'specialized' : 'capable'} in ${task.type}`,
      );
    }

    const agentPrivacyIndex = this.privacyHierarchy.indexOf(agent.minPrivacyLevel);
    const taskPrivacyIndex = this.privacyHierarchy.indexOf(task.privacyLevel);
    if (taskPrivacyIndex <= agentPrivacyIndex) {
      reasons.push(`Meets privacy requirement (${task.privacyLevel})`);
    }

    if (agent.supportedRiskLevels.includes(task.riskLevel)) {
      reasons.push(`Approved for risk level ${task.riskLevel}`);
    }

    if (this.latencyValues[agent.minLatency] <= this.latencyValues[task.latencyRequirement]) {
      reasons.push(`Latency capability matches requirement (${task.latencyRequirement})`);
    }

    if (task.maxCostCents && this.estimateCost(agent, task) <= task.maxCostCents) {
      reasons.push(`Within cost budget`);
    }

    reasons.push(`Routing score: ${score.toFixed(1)}/100`);

    return reasons.join('; ');
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentCapability | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agents by task type
   */
  getAgentsByTaskType(taskType: TaskType): AgentCapability[] {
    return this.getAgents().filter(a => a.supportedTaskTypes.includes(taskType));
  }

  /**
   * Get agents by privacy level or higher
   */
  getAgentsByPrivacyLevel(privacyLevel: PrivacyLevel): AgentCapability[] {
    const privacyIndex = this.privacyHierarchy.indexOf(privacyLevel);
    return this.getAgents().filter(a => {
      const agentIndex = this.privacyHierarchy.indexOf(a.minPrivacyLevel);
      return agentIndex <= privacyIndex;
    });
  }

  /**
   * Get agents by risk level support
   */
  getAgentsByRiskLevel(riskLevel: RiskLevel): AgentCapability[] {
    return this.getAgents().filter(a => a.supportedRiskLevels.includes(riskLevel));
  }

  /**
   * Get agents by latency requirement
   */
  getAgentsByLatency(latencyTier: LatencyTier): AgentCapability[] {
    return this.getAgents().filter(a => {
      return this.latencyValues[a.minLatency] <= this.latencyValues[latencyTier];
    });
  }

  /**
   * Get agents within cost constraint
   */
  getAgentsByCost(maxCostCents: number, estimatedTokens?: number): AgentCapability[] {
    return this.getAgents().filter(a => {
      if (estimatedTokens && a.costPerToken) {
        return estimatedTokens * a.costPerToken <= maxCostCents;
      }
      return (a.maxCostPerCall || 0) <= maxCostCents;
    });
  }

  /**
   * Check if task requires human approval
   */
  requiresApproval(task: RoutingTask): boolean {
    const result = this.routeByCapability(task);
    return result.requiresApproval;
  }
}
