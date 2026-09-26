import { z } from "zod";
import { ActorType, RiskLevel } from "@/src/types/enums";

export const AuditEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid().nullable().optional(),
  stepId: z.string().uuid().nullable().optional(),
  actorType: z.nativeEnum(ActorType),
  actorId: z.string(),
  action: z.string().min(1),
  resourceType: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
  costCents: z.number().int().nonnegative().nullable().optional(),
  riskLevel: z.nativeEnum(RiskLevel).nullable().optional(),
  createdAt: z.string().datetime(),
});
