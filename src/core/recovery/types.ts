/**
 * Recovery, Watchdog & Conflict Resolver Type Definitions
 * B10 Phase - Error recovery, task monitoring, and result arbitration
 */

import { TaskId, StepId, AgentId, CheckpointId } from '@/types/domain';

// ============================================================================
// Recovery Engine Types
// ============================================================================

export enum ErrorClassification {
  TIMEOUT = 'TIMEOUT',
  PROVIDER_FAILURE = 'PROVIDER_FAILURE',
  TOOL_FAILURE = 'TOOL_FAILURE',
  MODEL_FAILURE = 'MODEL_FAILURE',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CORRUPT_DATA = 'CORRUPT_DATA',
  DUPLICATE_TASK = 'DUPLICATE_TASK',
  CONFLICTING_RESULT = 'CONFLICTING_RESULT',
  STALE_TASK = 'STALE_TASK',
  RETRY_LIMIT_EXCEEDED = 'RETRY_LIMIT_EXCEEDED',
  UNKNOWN = 'UNKNOWN',
}

export enum RecoveryAction {
  RETRY = 'RETRY',
  FALLBACK_PROVIDER = 'FALLBACK_PROVIDER',
  FALLBACK_TOOL = 'FALLBACK_TOOL',
  FALLBACK_MODEL = 'FALLBACK_MODEL',
  ESCALATE = 'ESCALATE',
  RECOVER_CHECKPOINT = 'RECOVER_CHECKPOINT',
  MERGE_TASK = 'MERGE_TASK',
  ARBITRATE = 'ARBITRATE',
  REQUEUE = 'REQUEUE',
  CANCEL = 'CANCEL',
}

export interface ErrorContext {
  taskId: TaskId;
  stepId?: StepId;
  agentId?: AgentId;
  error: Error | string;
  errorCode?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ClassificationResult {
  classification: ErrorClassification;
  confidence: number; // 0-1
  suggestedAction: RecoveryAction;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  metadata?: Record<string, unknown>;
}

export interface RecoveryPlan {
  taskId: TaskId;
  classification: ErrorClassification;
  primaryAction: RecoveryAction;
  fallbackActions: RecoveryAction[];
  retryCount: number;
  maxRetries: number;
  backoffMs: number;
  checkpointId?: CheckpointId;
  alternateProvider?: string;
  alternateTool?: string;
  alternateModel?: string;
  escalationReason?: string;
  createdAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: RecoveryResult;
}

export interface RecoveryResult {
  success: boolean;
  actionTaken: RecoveryAction;
  actualRetryCount: number;
  output?: Record<string, unknown>;
  error?: string;
  checkpointRestored?: boolean;
  timestamp: Date;
}

// ============================================================================
// Watchdog Types
// ============================================================================

export enum BlockageType {
  TIMEOUT = 'TIMEOUT',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  DEADLOCK = 'DEADLOCK',
  INFINITE_LOOP = 'INFINITE_LOOP',
  EXTERNAL_DEPENDENCY = 'EXTERNAL_DEPENDENCY',
  PERMISSION_WAIT = 'PERMISSION_WAIT',
  UNKNOWN = 'UNKNOWN',
}

export interface StuckTaskDetection {
  taskId: TaskId;
  isStuck: boolean;
  stuckDuration: number; // milliseconds
  blockageType: BlockageType;
  lastActivity: Date;
  lastSuccessfulStep?: StepId;
  consecutiveErrors: number;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface TaskTimeline {
  taskId: TaskId;
  startTime: Date;
  lastActivityTime: Date;
  stepExecutions: StepExecution[];
  errorHistory: ErrorEvent[];
}

export interface StepExecution {
  stepId: StepId;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  retriesUsed: number;
}

export interface ErrorEvent {
  timestamp: Date;
  stepId?: StepId;
  error: string;
  classification: ErrorClassification;
  action: RecoveryAction;
}

export interface ReassignmentPlan {
  taskId: TaskId;
  sourceAgent: AgentId;
  targetAgent: AgentId;
  targetEnvironment?: string;
  preserveState: boolean;
  checkpointId?: CheckpointId;
  reason: string;
  createdAt: Date;
}

// ============================================================================
// Conflict Resolver Types
// ============================================================================

export enum ConflictType {
  RESULT_MISMATCH = 'RESULT_MISMATCH',
  STATE_DIVERGENCE = 'STATE_DIVERGENCE',
  DUPLICATE_EXECUTION = 'DUPLICATE_EXECUTION',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  CONTRADICTORY_EVIDENCE = 'CONTRADICTORY_EVIDENCE',
}

export interface ConflictDetection {
  taskId: TaskId;
  hasConflict: boolean;
  conflictType: ConflictType;
  agentIds: AgentId[];
  results: TaskResult[];
  divergenceScore: number; // 0-1, how different are the results
  timestamp: Date;
  evidence: ConflictEvidence[];
}

export interface TaskResult {
  agentId: AgentId;
  output: Record<string, unknown>;
  timestamp: Date;
  executionTime: number; // milliseconds
  confidence?: number; // 0-1
  evidence?: string[];
}

export interface ConflictEvidence {
  type: 'log' | 'checkpoint' | 'output' | 'timestamp' | 'signature';
  agentId: AgentId;
  content: string;
  timestamp: Date;
}

export interface ArbitrationDecision {
  taskId: TaskId;
  conflictType: ConflictType;
  winnerAgentId: AgentId;
  winnerResult: Record<string, unknown>;
  reasoning: string;
  confidence: number; // 0-1
  secondPlaceAgentId?: AgentId;
  requiresHumanReview: boolean;
  timestamp: Date;
}

export interface ConflictResolutionPolicy {
  name: string;
  conflictTypes: ConflictType[];
  arbitrationMethod: 'majority' | 'timestamp' | 'confidence' | 'custom' | 'human';
  requiresHumanReview: boolean;
  timeoutMs: number;
  customJudge?: (results: TaskResult[]) => Promise<AgentId>;
}

// ============================================================================
// Stale Task Detector Types
// ============================================================================

export interface IdleTaskInfo {
  taskId: TaskId;
  isIdle: boolean;
  idleDuration: number; // milliseconds
  lastUpdate: Date;
  lastStep: StepId;
  expectedDuration?: number; // milliseconds
  percentageComplete: number;
  reason: string;
}

export interface TaskHealthMetrics {
  taskId: TaskId;
  healthScore: number; // 0-100
  isHealthy: boolean;
  recentErrors: number;
  errorRate: number; // percentage
  avgStepDuration: number; // milliseconds
  estimatedRemainingTime: number; // milliseconds
  lastUpdate: Date;
}
