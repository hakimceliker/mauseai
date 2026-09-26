import { z } from "zod";
import { RiskLevel, TaskStatus } from "@/src/types/enums";

export const CreateTaskSchema = z.object({
  goal: z.string().min(5).max(2000),
  riskLevel: z.nativeEnum(RiskLevel).default(RiskLevel.L2),
  budgetLimitCents: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdBy: z.string().uuid(),
  goal: z.string(),
  status: z.nativeEnum(TaskStatus),
  riskLevel: z.nativeEnum(RiskLevel),
  workflowId: z.string().uuid().nullable().optional(),
  currentStepId: z.string().uuid().nullable().optional(),
  budgetLimitCents: z.number().int().nullable().optional(),
  spentCents: z.number().int().nonnegative(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
