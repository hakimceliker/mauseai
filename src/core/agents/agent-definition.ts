/**
 * Agent Definition Module
 *
 * Provides extended definitions for agents including metrics tracking
 * and registry-specific fields. Re-exports contract types from B1.
 */

import {
  AgentRole,
  DataScope,
  RiskLevel,
  AgentType,
} from "@/src/core/contracts/agent-contract";

/**
 * Extended agent definition with metrics for the registry
 * Includes all contract fields plus registry-specific metrics
 */
export interface AgentDefinition extends AgentType {
  // Metadata
  createdAt: Date;
  lastActivity: Date;
  successRate: number; // 0-1, success rate of executed tasks
  retryCount: number; // total number of retries across all tasks
  totalTasksExecuted: number; // lifetime task count
  totalTasksFailed: number; // lifetime failure count
}

/**
 * Agent metrics for updating agent performance tracking
 */
export interface AgentMetrics {
  successRate?: number;
  lastActivity?: Date;
  retryCount?: number;
  totalTasksExecuted?: number;
  totalTasksFailed?: number;
}

/**
 * Safe agent definition result for operations that might fail
 */
export interface AgentDefinitionResult {
  success: boolean;
  agent?: AgentDefinition;
  error?: string;
}

/**
 * Agent registry filter options
 */
export interface AgentFilterOptions {
  role?: AgentRole;
  capability?: string;
  dataScope?: DataScope;
  riskLevel?: RiskLevel;
}

/**
 * Re-export contract types for convenience
 */
export type { AgentType } from "@/src/core/contracts/agent-contract";
export { AgentRole, DataScope, RiskLevel } from "@/src/core/contracts/agent-contract";
