/**
 * Conflict Resolver - Detects and Arbitrates Agent Result Conflicts
 * B10 Phase - Manages conflicting results from multiple agents
 */

import { TaskId, AgentId } from '../../types/domain';
import {
  ConflictType,
  ConflictDetection,
  TaskResult,
  ConflictEvidence,
  ArbitrationDecision,
  ConflictResolutionPolicy,
} from '../recovery/types';

export interface ConflictResolverConfig {
  enableAutoResolution: boolean;
  requiresHumanReview: boolean;
  arbitrationTimeoutMs: number;
  maxConflictHistorySize: number;
}

const DEFAULT_CONFIG: ConflictResolverConfig = {
  enableAutoResolution: true,
  requiresHumanReview: false,
  arbitrationTimeoutMs: 30000,
  maxConflictHistorySize: 100,
};

/**
 * Conflict Resolver - Detects and resolves conflicts between agent results
 */
export class ConflictResolver {
  private config: ConflictResolverConfig;
  private policies: Map<string, ConflictResolutionPolicy> = new Map();
  private conflictHistory: ConflictDetection[] = [];
  private arbitrationDecisions: Map<TaskId, ArbitrationDecision> = new Map();

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultPolicies();
  }

  /**
   * Initialize default resolution policies
   */
  private initializeDefaultPolicies(): void {
    this.policies.set('default', {
      name: 'default',
      conflictTypes: [ConflictType.RESULT_MISMATCH],
      arbitrationMethod: 'confidence',
      requiresHumanReview: false,
      timeoutMs: this.config.arbitrationTimeoutMs,
    });

    this.policies.set('critical', {
      name: 'critical',
      conflictTypes: [ConflictType.CONTRADICTORY_EVIDENCE, ConflictType.STATE_DIVERGENCE],
      arbitrationMethod: 'human',
      requiresHumanReview: true,
      timeoutMs: this.config.arbitrationTimeoutMs,
    });

    this.policies.set('majority', {
      name: 'majority',
      conflictTypes: [ConflictType.DUPLICATE_EXECUTION],
      arbitrationMethod: 'majority',
      requiresHumanReview: false,
      timeoutMs: this.config.arbitrationTimeoutMs,
    });
  }

  /**
   * Detect conflict between results
   */
  async detectConflict(taskId: TaskId, results: TaskResult[]): Promise<ConflictDetection | null> {
    if (results.length < 2) {
      return null;
    }

    // Check for result mismatches
    const divergenceScore = this.calculateDivergenceScore(results);

    if (divergenceScore < 0.1) {
      // Results are very similar, no conflict
      return null;
    }

    // Determine conflict type
    const conflictType = this.classifyConflict(results);

    // Extract evidence
    const evidence = this.extractConflictEvidence(results);

    const detection: ConflictDetection = {
      taskId,
      hasConflict: true,
      conflictType,
      agentIds: results.map((r) => r.agentId),
      results,
      divergenceScore,
      timestamp: new Date(),
      evidence,
    };

    // Store in history
    this.addToHistory(detection);

    return detection;
  }

  /**
   * Calculate how different results are from each other
   */
  private calculateDivergenceScore(results: TaskResult[]): number {
    if (results.length < 2) return 0;

    let totalDivergence = 0;
    let comparisonCount = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const divergence = this.compareResults(results[i].output, results[j].output);
        totalDivergence += divergence;
        comparisonCount++;
      }
    }

    return comparisonCount > 0 ? totalDivergence / comparisonCount : 0;
  }

  /**
   * Compare two result objects
   */
  private compareResults(output1: Record<string, unknown>, output2: Record<string, unknown>): number {
    const keys1 = Object.keys(output1);
    const keys2 = Object.keys(output2);

    // Check if keys differ
    if (keys1.length !== keys2.length) {
      return 0.5; // Significant difference
    }

    let differences = 0;
    for (const key of keys1) {
      if (!(key in output2)) {
        differences++;
      } else if (JSON.stringify(output1[key]) !== JSON.stringify(output2[key])) {
        differences++;
      }
    }

    return differences / keys1.length;
  }

  /**
   * Classify the type of conflict
   */
  private classifyConflict(results: TaskResult[]): ConflictType {
    // Check for result mismatches
    const divergenceScore = this.calculateDivergenceScore(results);
    if (divergenceScore > 0.5) {
      return ConflictType.RESULT_MISMATCH;
    }

    // Check for timestamps indicating concurrent execution
    const timestamps = results.map((r) => r.timestamp.getTime());
    const timeRanges = Math.max(...timestamps) - Math.min(...timestamps);
    if (timeRanges < 5000) {
      // Within 5 seconds - likely concurrent
      return ConflictType.CONCURRENT_MODIFICATION;
    }

    // Check for duplicate execution (same agent, same output)
    if (results.length === 2) {
      if (
        results[0].agentId !== results[1].agentId &&
        JSON.stringify(results[0].output) === JSON.stringify(results[1].output)
      ) {
        return ConflictType.DUPLICATE_EXECUTION;
      }
    }

    // Default to result mismatch
    return ConflictType.RESULT_MISMATCH;
  }

  /**
   * Extract evidence for conflict
   */
  private extractConflictEvidence(results: TaskResult[]): ConflictEvidence[] {
    const evidence: ConflictEvidence[] = [];

    for (const result of results) {
      evidence.push({
        type: 'timestamp',
        agentId: result.agentId,
        content: result.timestamp.toISOString(),
        timestamp: result.timestamp,
      });

      if (result.evidence && result.evidence.length > 0) {
        for (const ev of result.evidence) {
          evidence.push({
            type: 'log',
            agentId: result.agentId,
            content: ev,
            timestamp: result.timestamp,
          });
        }
      }

      evidence.push({
        type: 'output',
        agentId: result.agentId,
        content: JSON.stringify(result.output),
        timestamp: result.timestamp,
      });
    }

    return evidence;
  }

  /**
   * Arbitrate conflict and make decision
   */
  async arbitrateConflict(taskId: TaskId, results: TaskResult[]): Promise<ArbitrationDecision> {
    const policy = this.getApplicablePolicy(results);

    let winnerAgentId: AgentId;
    let reasoning: string;
    let confidence: number;

    switch (policy.arbitrationMethod) {
      case 'confidence':
        ({ winnerAgentId, reasoning, confidence } = this.arbitrateByConfidence(results));
        break;
      case 'timestamp':
        ({ winnerAgentId, reasoning, confidence } = this.arbitrateByTimestamp(results));
        break;
      case 'majority':
        ({ winnerAgentId, reasoning, confidence } = await this.arbitrateByMajority(results));
        break;
      case 'custom':
        if (policy.customJudge) {
          winnerAgentId = await policy.customJudge(results);
          reasoning = 'Custom judge decision';
          confidence = 0.9;
        } else {
          throw new Error('Custom judge not defined');
        }
        break;
      case 'human':
        throw new Error('Human arbitration required');
      default:
        throw new Error('Unknown arbitration method');
    }

    // Find second place
    const sortedByConfidence = [...results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const secondPlaceAgentId = sortedByConfidence[1]?.agentId;

    const decision: ArbitrationDecision = {
      taskId,
      conflictType: ConflictType.RESULT_MISMATCH,
      winnerAgentId,
      winnerResult: results.find((r) => r.agentId === winnerAgentId)?.output || {},
      reasoning,
      confidence,
      secondPlaceAgentId,
      requiresHumanReview: policy.requiresHumanReview,
      timestamp: new Date(),
    };

    this.arbitrationDecisions.set(taskId, decision);
    return decision;
  }

  /**
   * Arbitrate by confidence score
   */
  private arbitrateByConfidence(
    results: TaskResult[]
  ): { winnerAgentId: AgentId; reasoning: string; confidence: number } {
    const sorted = [...results].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const winner = sorted[0];

    return {
      winnerAgentId: winner.agentId,
      reasoning: `Selected result from ${winner.agentId} with highest confidence score: ${winner.confidence?.toFixed(2) || 'N/A'}`,
      confidence: winner.confidence || 0.8,
    };
  }

  /**
   * Arbitrate by timestamp (first is winner)
   */
  private arbitrateByTimestamp(
    results: TaskResult[]
  ): { winnerAgentId: AgentId; reasoning: string; confidence: number } {
    const sorted = [...results].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const winner = sorted[0];

    return {
      winnerAgentId: winner.agentId,
      reasoning: `Selected result from ${winner.agentId} with earliest timestamp`,
      confidence: 0.7,
    };
  }

  /**
   * Arbitrate by majority vote
   */
  private async arbitrateByMajority(
    results: TaskResult[]
  ): Promise<{ winnerAgentId: AgentId; reasoning: string; confidence: number }> {
    // For majority voting, we'd need more agents
    // For now, just pick the most confident
    return this.arbitrateByConfidence(results);
  }

  /**
   * Get applicable policy for conflict
   */
  private getApplicablePolicy(results: TaskResult[]): ConflictResolutionPolicy {
    const divergenceScore = this.calculateDivergenceScore(results);

    // Use critical policy if divergence is high
    if (divergenceScore > 0.7) {
      return this.policies.get('critical') || this.policies.get('default')!;
    }

    return this.policies.get('default')!;
  }

  /**
   * Add conflict to history
   */
  private addToHistory(detection: ConflictDetection): void {
    this.conflictHistory.push(detection);

    // Maintain max history size
    if (this.conflictHistory.length > this.config.maxConflictHistorySize) {
      this.conflictHistory.shift();
    }
  }

  /**
   * Register conflict resolution policy
   */
  registerPolicy(policy: ConflictResolutionPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Get arbitration decision for task
   */
  getArbitrationDecision(taskId: TaskId): ArbitrationDecision | undefined {
    return this.arbitrationDecisions.get(taskId);
  }

  /**
   * Get conflict history
   */
  getConflictHistory(): ConflictDetection[] {
    return [...this.conflictHistory];
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalConflicts: number;
    conflictsByType: Record<string, number>;
    resolutionRate: number;
    averageDivergenceScore: number;
  } {
    const conflictsByType: Record<string, number> = {};
    let totalDivergence = 0;

    for (const conflict of this.conflictHistory) {
      conflictsByType[conflict.conflictType] = (conflictsByType[conflict.conflictType] || 0) + 1;
      totalDivergence += conflict.divergenceScore;
    }

    const resolutionRate =
      this.arbitrationDecisions.size /
      Math.max(this.conflictHistory.filter((c) => c.hasConflict).length, 1);

    return {
      totalConflicts: this.conflictHistory.filter((c) => c.hasConflict).length,
      conflictsByType,
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      averageDivergenceScore:
        this.conflictHistory.length > 0
          ? totalDivergence / this.conflictHistory.length
          : 0,
    };
  }

  /**
   * Clear decision for task
   */
  clearDecision(taskId: TaskId): void {
    this.arbitrationDecisions.delete(taskId);
  }
}

export default ConflictResolver;
