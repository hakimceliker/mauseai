/**
 * Handoff Engine Module
 * Ajan arası görev devri mekanizması
 */

export type { HandoffEnvelope, ParsedHandoffEnvelope, ParsedAgent, ParsedHandoff } from './handoff-envelope';

export {
  HandoffEnvelopeSchema,
  AgentSchema,
  HandoffSchema,
  AgentIdSchema,
  HandoffIdSchema,
  EvidenceRefSchema,
  parseHandoffEnvelope,
  safeParseHandoffEnvelope,
  parseAgent,
  safeParseAgent,
  parseHandoff,
  safeParseHandoff,
  handoffValidators,
} from './handoff-envelope';

export type { ValidationError, ValidationResult } from './handoff-validator';
export { HandoffValidator } from './handoff-validator';

export type {
  HandoffOperationResult,
  HandoffHistoryEntry,
  HandoffTrackingResult,
} from './handoff-engine';
export { HandoffEngine, createHandoffEngine } from './handoff-engine';
