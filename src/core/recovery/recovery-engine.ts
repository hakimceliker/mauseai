export type FailureKind =
  | 'VALIDATION'
  | 'AUTHORIZATION'
  | 'CREDENTIAL'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'PROVIDER'
  | 'TOOL'
  | 'DATA'
  | 'UNKNOWN';

export type RecoveryAction =
  | 'RETRY'
  | 'FALLBACK_PROVIDER'
  | 'REPLAN'
  | 'HUMAN_APPROVAL'
  | 'BLOCKED';

export interface RecoveryDecision {
  kind: FailureKind;
  action: RecoveryAction;
  retryable: boolean;
  reason: string;
}

export interface RecoveryInput {
  error: unknown;
  attempt: number;
  maxAttempts: number;
  fallbackAvailable?: boolean;
  humanApprovalRequired?: boolean;
}

function errorDetails(error: unknown): { message: string; code?: string; status?: number } {
  if (!(error instanceof Error)) return { message: 'unknown error' };
  const candidate = error as Error & { code?: string; status?: number };
  return { message: candidate.message, code: candidate.code, status: candidate.status };
}

export function classifyFailure(error: unknown): FailureKind {
  const details = errorDetails(error);
  const code = details.code?.toUpperCase();
  const message = details.message.toLowerCase();

  if (code === 'VALIDATION' || details.status === 400) return 'VALIDATION';
  if (code === 'AUTHORIZATION' || details.status === 401 || details.status === 403) return 'AUTHORIZATION';
  if (code === 'CREDENTIAL' || message.includes('credential')) return 'CREDENTIAL';
  if (code === 'TIMEOUT' || message.includes('timeout') || message.includes('network')) return 'TIMEOUT';
  if (details.status === 429 || code === 'RATE_LIMIT') return 'RATE_LIMIT';
  if (code === 'TOOL') return 'TOOL';
  if (code === 'DATA' || message.includes('invalid data')) return 'DATA';
  if (code === 'PROVIDER' || details.status === 502 || details.status === 503 || details.status === 504) return 'PROVIDER';
  return 'UNKNOWN';
}

export function decideRecovery(input: RecoveryInput): RecoveryDecision {
  const kind = classifyFailure(input.error);
  const attemptsRemain = input.attempt < input.maxAttempts;

  if (input.humanApprovalRequired) {
    return { kind, action: 'HUMAN_APPROVAL', retryable: false, reason: 'human approval is required' };
  }

  if (kind === 'AUTHORIZATION' || kind === 'VALIDATION' || kind === 'DATA') {
    return { kind, action: 'REPLAN', retryable: false, reason: 'the input or authority must change before retry' };
  }

  if ((kind === 'CREDENTIAL' || kind === 'PROVIDER') && input.fallbackAvailable) {
    return { kind, action: 'FALLBACK_PROVIDER', retryable: false, reason: 'fallback provider is available' };
  }

  if ((kind === 'TIMEOUT' || kind === 'RATE_LIMIT' || kind === 'TOOL' || kind === 'UNKNOWN') && attemptsRemain) {
    return { kind, action: 'RETRY', retryable: true, reason: 'retry budget remains' };
  }

  return { kind, action: 'BLOCKED', retryable: false, reason: 'recovery options are exhausted' };
}
