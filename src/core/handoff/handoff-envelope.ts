/**
 * Handoff Envelope - Data structure for inter-agent task handoff
 *
 * Ajan arası görev devri mekanizması için veri yapısı.
 * Sağlanan agent'ten hedef agent'e görev devredilmesi sırasında
 * taşınan tüm bilgileri içerir.
 */

import { z } from 'zod';
import * as Domain from '@/src/types/domain';

/**
 * Handoff envelope contains all information needed for agent-to-agent task transfer
 * with full context, evidence chain, and validation metadata
 */
export interface HandoffEnvelope {
  // Agent identifiers
  sourceAgent: string;
  targetAgent: string;

  // Task reference
  taskId: string;

  // Task context and state
  context: Record<string, unknown>;

  // Reason for handoff
  reason: string;

  // Task output/results
  output?: Record<string, unknown>;

  // Evidence reference for audit trail
  evidenceRef?: string;

  // Commit hash for reproducibility
  sha: string;

  // Schema version for compatibility
  schemaVersion: string;

  // Timestamp
  timestamp: Date;
}

/**
 * Create ID validators for handoff types
 */
const createIdValidator = (brand: string) =>
  z.string().min(1).max(255).transform((val: string) => {
    if (val.trim().length === 0) {
      throw new Error(`${brand} cannot be empty`);
    }
    return val as string;
  });

export const AgentIdSchema = createIdValidator('AgentId');
export const HandoffIdSchema = createIdValidator('HandoffId');
export const EvidenceRefSchema = createIdValidator('EvidenceRef');

/**
 * Validation schema for Handoff Envelope
 * Ensures all required fields are present and properly formatted
 */
export const HandoffEnvelopeSchema = z.object({
  sourceAgent: z.string().min(1).max(255).describe('Source agent ID'),
  targetAgent: z.string().min(1).max(255).describe('Target agent ID'),
  taskId: z.string().min(1).max(255).describe('Task ID being handed off'),
  context: z.record(z.unknown()).describe('Task execution context'),
  reason: z.string().min(1).max(1000).describe('Reason for handoff'),
  output: z
    .record(z.unknown())
    .optional()
    .describe('Task output/results'),
  evidenceRef: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Reference to evidence/audit trail'),
  sha: z.string().min(1).max(255).describe('Git commit hash'),
  schemaVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .describe('Schema version in semver format'),
  timestamp: z
    .union([z.coerce.date(), z.date()])
    .describe('Handoff initiation timestamp'),
});

/**
 * Validation schema for Agent entity
 */
export const AgentSchema = z.object({
  id: AgentIdSchema,
  tenant_id: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.enum(['executor', 'judge', 'reviewer', 'orchestrator']),
  description: z.string().optional(),
  capabilities: z.array(z.string().min(1)),
  is_active: z.boolean(),
  created_at: z.union([z.coerce.date(), z.date()]),
  updated_at: z.union([z.coerce.date(), z.date()]),
});

/**
 * Validation schema for Handoff entity
 */
export const HandoffSchema = z.object({
  id: HandoffIdSchema,
  tenant_id: z.string().min(1),
  source_agent_id: AgentIdSchema,
  target_agent_id: AgentIdSchema,
  task_id: z.string().min(1),
  status: z.enum([
    'pending',
    'initiated',
    'validated',
    'executing',
    'completed',
    'failed',
    'cancelled',
  ]),
  result: z
    .enum(['success', 'failure', 'timeout', 'cancelled'])
    .optional(),
  context: z.record(z.unknown()),
  reason: z.string().min(1).max(1000),
  output: z.record(z.unknown()).optional(),
  evidence_ref: z.string().min(1).max(255).optional(),
  error: z.string().optional(),
  sha: z.string().min(1).max(255),
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  initiated_at: z.union([z.coerce.date(), z.date()]),
  completed_at: z.union([z.coerce.date(), z.date()]).optional(),
  created_at: z.union([z.coerce.date(), z.date()]),
  updated_at: z.union([z.coerce.date(), z.date()]),
});

/**
 * Type for parsed handoff envelope
 */
export type ParsedHandoffEnvelope = z.infer<typeof HandoffEnvelopeSchema>;

/**
 * Type for parsed agent
 */
export type ParsedAgent = z.infer<typeof AgentSchema>;

/**
 * Type for parsed handoff
 */
export type ParsedHandoff = z.infer<typeof HandoffSchema>;

/**
 * Parse and validate a handoff envelope
 * @param data - Raw handoff envelope data
 * @returns Parsed and validated envelope
 * @throws ZodError if validation fails
 */
export function parseHandoffEnvelope(
  data: unknown
): ParsedHandoffEnvelope {
  return HandoffEnvelopeSchema.parse(data);
}

/**
 * Safely parse and validate a handoff envelope
 * @param data - Raw handoff envelope data
 * @returns Result with success flag and data or error
 */
export function safeParseHandoffEnvelope(
  data: unknown
): z.SafeParseReturnType<unknown, ParsedHandoffEnvelope> {
  return HandoffEnvelopeSchema.safeParse(data);
}

/**
 * Parse and validate an agent
 * @param data - Raw agent data
 * @returns Parsed and validated agent
 * @throws ZodError if validation fails
 */
export function parseAgent(data: unknown): ParsedAgent {
  return AgentSchema.parse(data);
}

/**
 * Safely parse and validate an agent
 * @param data - Raw agent data
 * @returns Result with success flag and data or error
 */
export function safeParseAgent(
  data: unknown
): z.SafeParseReturnType<unknown, ParsedAgent> {
  return AgentSchema.safeParse(data);
}

/**
 * Parse and validate a handoff
 * @param data - Raw handoff data
 * @returns Parsed and validated handoff
 * @throws ZodError if validation fails
 */
export function parseHandoff(data: unknown): ParsedHandoff {
  return HandoffSchema.parse(data);
}

/**
 * Safely parse and validate a handoff
 * @param data - Raw handoff data
 * @returns Result with success flag and data or error
 */
export function safeParseHandoff(
  data: unknown
): z.SafeParseReturnType<unknown, ParsedHandoff> {
  return HandoffSchema.safeParse(data);
}

/**
 * Export validators object for consistent API
 */
export const handoffValidators = {
  agent: AgentSchema,
  handoff: HandoffSchema,
  handoffEnvelope: HandoffEnvelopeSchema,
};
