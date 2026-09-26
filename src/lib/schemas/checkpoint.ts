import { z } from "zod";

export const CheckpointSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid(),
  stepId: z.string().uuid(),
  state: z.record(z.string(), z.unknown()),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
});
