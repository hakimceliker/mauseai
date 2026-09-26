import { z } from "zod";
import { StepStatus } from "@/src/types/enums";

export const StepSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid(),
  workflowId: z.string().uuid(),
  nodeId: z.string(),
  name: z.string(),
  status: z.nativeEnum(StepStatus),
  attempt: z.number().int().positive(),
  input: z.record(z.string(), z.unknown()).nullable().optional(),
  output: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
