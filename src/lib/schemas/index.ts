import { z } from 'zod';
import * as Domain from '@/src/types/domain';

// ID creation helpers - validate but pass through as branded types
const createIdValidator = (brand: string) => z.string().min(1).max(255).transform((val) => {
  if (val.trim().length === 0) {
    throw new Error(`${brand} cannot be empty`);
  }
  return val as any;
});

export const TenantIdSchema = createIdValidator('TenantId');
export const TaskIdSchema = createIdValidator('TaskId');
export const WorkflowIdSchema = createIdValidator('WorkflowId');
export const StepIdSchema = createIdValidator('StepId');
export const CheckpointIdSchema = createIdValidator('CheckpointId');
export const AuditEventIdSchema = createIdValidator('AuditEventId');

// Step schema
const StepSchema = z.object({
  id: StepIdSchema,
  workflow_id: WorkflowIdSchema,
  order: z.number().int().positive(),
  name: z.string().min(1),
  type: z.enum(['ai_call', 'transformation', 'decision', 'action']),
  config: z.record(z.unknown()),
  retries: z.number().int().nonnegative(),
  timeout_ms: z.number().int().positive(),
});

// Workflow schema
export const WorkflowSchema = z.object({
  id: WorkflowIdSchema,
  tenant_id: TenantIdSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  steps: z.array(StepSchema),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// Task schema
export const TaskSchema = z.object({
  id: TaskIdSchema,
  tenant_id: TenantIdSchema,
  user_id: z.string().min(1),
  workflow_id: WorkflowIdSchema,
  status: z.nativeEnum(Domain.TaskStatus),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  cost_estimate: z.number().nonnegative(),
  cost_actual: z.number().nonnegative().optional(),
  created_at: z.coerce.date(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
});

// Checkpoint schema
export const CheckpointSchema = z.object({
  id: CheckpointIdSchema,
  task_id: TaskIdSchema,
  step_id: StepIdSchema,
  state: z.record(z.unknown()),
  created_at: z.coerce.date(),
});

// AuditEvent schema
export const AuditEventSchema = z.object({
  id: AuditEventIdSchema,
  tenant_id: TenantIdSchema,
  action: z.nativeEnum(Domain.AuditAction),
  entity_type: z.enum(['task', 'step', 'checkpoint', 'cost']),
  entity_id: z.string().min(1),
  actor: z.string().min(1),
  details: z.record(z.unknown()),
  timestamp: z.coerce.date(),
});

// Export validators
export const validators = {
  tenantId: TenantIdSchema,
  taskId: TaskIdSchema,
  workflow: WorkflowSchema,
  task: TaskSchema,
  checkpoint: CheckpointSchema,
  auditEvent: AuditEventSchema,
};
