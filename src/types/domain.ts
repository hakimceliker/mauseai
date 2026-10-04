// Core domain types - tenant-aware, audit-ready

import {
  TaskStatus,
  AgentType,
  HandoffStatus,
  HandoffResult,
} from './enums';

// Re-export frequently used enums for convenient imports from domain
export { TaskStatus, AgentType, HandoffStatus, HandoffResult };

export type TenantId = string & { readonly __brand: 'TenantId' };
export type TaskId = string & { readonly __brand: 'TaskId' };
export type WorkflowId = string & { readonly __brand: 'WorkflowId' };
export type StepId = string & { readonly __brand: 'StepId' };
export type CheckpointId = string & { readonly __brand: 'CheckpointId' };
export type AuditEventId = string & { readonly __brand: 'AuditEventId' };
export type AgentId = string & { readonly __brand: 'AgentId' };
export type HandoffId = string & { readonly __brand: 'HandoffId' };
export type EvidenceRef = string & { readonly __brand: 'EvidenceRef' };

// Workflow entity
export interface Workflow {
  id: WorkflowId;
  tenant_id: TenantId;
  name: string;
  description?: string;
  steps: Step[];
  created_at: Date;
  updated_at: Date;
}

// Step in workflow
export interface Step {
  id: StepId;
  workflow_id: WorkflowId;
  order: number;
  name: string;
  type: 'ai_call' | 'transformation' | 'decision' | 'action';
  config: Record<string, unknown>;
  retries: number;
  timeout_ms: number;
}

// Task - single execution of workflow
export interface Task {
  id: TaskId;
  tenant_id: TenantId;
  user_id: string;
  workflow_id: WorkflowId;
  status: TaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  cost_estimate: number;
  cost_actual?: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

// Checkpoint - resumption point
export interface Checkpoint {
  id: CheckpointId;
  task_id: TaskId;
  step_id: StepId;
  state: Record<string, unknown>;
  created_at: Date;
}

// Agent
export interface Agent {
  id: AgentId;
  tenant_id: TenantId;
  name: string;
  type: AgentType;
  description?: string;
  capabilities: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Handoff - inter-agent task transfer
export interface Handoff {
  id: HandoffId;
  tenant_id: TenantId;
  source_agent_id: AgentId;
  target_agent_id: AgentId;
  task_id: TaskId;
  status: HandoffStatus;
  result?: HandoffResult;
  context: Record<string, unknown>;
  reason: string;
  output?: Record<string, unknown>;
  evidence_ref?: EvidenceRef;
  error?: string;
  sha: string;
  schema_version: string;
  initiated_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Audit event
export enum AuditAction {
  TASK_CREATED = 'task_created',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  STEP_EXECUTED = 'step_executed',
  CHECKPOINT_CREATED = 'checkpoint_created',
  COST_INCURRED = 'cost_incurred',
  HANDOFF_INITIATED = 'handoff_initiated',
  HANDOFF_COMPLETED = 'handoff_completed',
  HANDOFF_FAILED = 'handoff_failed',
}

export interface AuditEvent {
  id: AuditEventId;
  tenant_id: TenantId;
  action: AuditAction;
  entity_type: 'task' | 'step' | 'checkpoint' | 'cost' | 'handoff';
  entity_id: string;
  actor: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
