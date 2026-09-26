import { z } from "zod";

export const AgentStatusSchema = z.enum([
  "ONLINE",
  "DEGRADED",
  "OFFLINE",
  "DISABLED",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentCapabilitySchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  permissions: z.array(z.string()).default([]),
});

export const AgentRegistrationSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(120),
  version: z.string().min(1),
  capabilities: z.array(AgentCapabilitySchema),
  status: AgentStatusSchema.default("ONLINE"),
});

export const AgentCommandSchema = z.object({
  commandId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  taskId: z.string().uuid(),
  stepId: z.string().uuid(),
  expiresAt: z.string().datetime(),
  action: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
  signature: z.string().min(1),
});

export const AgentResultSchema = z.object({
  commandId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  taskId: z.string().uuid(),
  stepId: z.string().uuid(),
  status: z.enum(["SUCCEEDED", "FAILED", "BLOCKED"]),
  output: z.record(z.string(), z.unknown()).nullable().default(null),
  checkpointVersion: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative().default(0),
  occurredAt: z.string().datetime(),
});

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  version: z.string().min(1),
  status: AgentStatusSchema,
  activeTasks: z.number().int().nonnegative(),
  sentAt: z.string().datetime(),
});

export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;
export type AgentCommand = z.infer<typeof AgentCommandSchema>;
export type AgentResult = z.infer<typeof AgentResultSchema>;
export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;
