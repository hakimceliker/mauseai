export type HealthState = 'HEALTHY' | 'STALE' | 'BLOCKED' | 'ESCALATE';

export interface WatchdogInput {
  status: 'TODO' | 'WORKING' | 'BLOCKED' | 'REVIEW' | 'PASS' | 'CLOSED';
  lastActivityAt: Date;
  now?: Date;
  staleAfterMs: number;
  blockedAfterMs: number;
  retryCount: number;
  maxRetries: number;
}

export interface WatchdogResult {
  state: HealthState;
  ageMs: number;
  reason: string;
  shouldRequeue: boolean;
  shouldEscalate: boolean;
}

export function inspectTaskHealth(input: WatchdogInput): WatchdogResult {
  const now = input.now ?? new Date();
  const ageMs = Math.max(0, now.getTime() - input.lastActivityAt.getTime());

  if (input.status === 'CLOSED' || input.status === 'PASS') {
    return { state: 'HEALTHY', ageMs, reason: 'terminal acceptance state', shouldRequeue: false, shouldEscalate: false };
  }

  if (input.status === 'BLOCKED') {
    const escalate = ageMs >= input.blockedAfterMs;
    return {
      state: escalate ? 'ESCALATE' : 'BLOCKED',
      ageMs,
      reason: escalate ? 'blocked task exceeded escalation window' : 'task is explicitly blocked',
      shouldRequeue: false,
      shouldEscalate: escalate,
    };
  }

  if (ageMs < input.staleAfterMs) {
    return { state: 'HEALTHY', ageMs, reason: 'recent task activity', shouldRequeue: false, shouldEscalate: false };
  }

  const exhausted = input.retryCount >= input.maxRetries;
  return {
    state: exhausted ? 'BLOCKED' : 'STALE',
    ageMs,
    reason: exhausted ? 'stale task exhausted retry budget' : 'task exceeded activity threshold',
    shouldRequeue: !exhausted,
    shouldEscalate: exhausted,
  };
}
