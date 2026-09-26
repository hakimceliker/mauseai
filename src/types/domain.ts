// Core domain types - tenant-aware, audit-ready

import { TaskStatus } from './enums';

// Re-export TaskStatus for convenient imports from domain
export { TaskStatus };

export type TenantId = string & { readonly __brand: 'TenantId' };
export type TaskId = string & { readonly __brand: 'TaskId' };
export type WorkflowId = string & { readonly __brand: 'WorkflowId' };
export type StepId = string & { readonly __brand: 'StepId' };
export type CheckpointId = string & { readonly __brand: 'CheckpointId' };
export type AuditEventId = string & { readonly __brand: 'AuditEventId' };

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

// Audit event
export enum AuditAction {
  TASK_CREATED = 'task_created',
  TASK_STARTED = 'task_started',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  STEP_EXECUTED = 'step_executed',
  CHECKPOINT_CREATED = 'checkpoint_created',
  COST_INCURRED = 'cost_incurred',
}

export interface AuditEvent {
  id: AuditEventId;
  tenant_id: TenantId;
  action: AuditAction;
  entity_type: 'task' | 'step' | 'checkpoint' | 'cost';
  entity_id: string;
  actor: string;
  details: Record<string, unknown>;
  timestamp: Date;
}
