/**
 * Agent Registry Module Exports
 *
 * Re-exports all agent-related types and functions for convenient imports.
 */

export {
  AgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
} from "@/src/core/agents/agent-registry";

export {
  CapabilityRegistry,
  getCapabilityRegistry,
  resetCapabilityRegistry,
  type Capability,
} from "@/src/core/agents/capability-definition";

export {
  type AgentDefinition,
  type AgentMetrics,
  type AgentDefinitionResult,
  type AgentFilterOptions,
  AgentRole,
  DataScope,
  RiskLevel,
  type AgentType,
} from "@/src/core/agents/agent-definition";
