import { z } from 'zod';
import { validators } from './index';

// Task creation request
export const CreateTaskRequestSchema = z.object({
  workflow_id: validators.tenantId,
  input: z.record(z.unknown()).optional(),
  expected_output: z.string().trim().min(1).max(10_000).optional(),
  success_criteria: z.array(z.string().trim().min(1).max(2_000)).min(1).max(50).optional(),
  approval_state: z.enum(['pending', 'approved']).optional(),
});

export type CreateTaskRequest = z.infer<typeof CreateTaskRequestSchema>;

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });
};

// Task Response
export const TaskResponseSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  user_id: z.string(),
  workflow_id: z.string(),
  status: z.string(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  cost_estimate: z.number(),
  cost_actual: z.number().optional(),
  created_at: z.string(),
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;
