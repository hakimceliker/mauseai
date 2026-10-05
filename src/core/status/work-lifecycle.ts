export type WorkStatus = 'TODO' | 'WORKING' | 'BLOCKED' | 'REVIEW' | 'PASS' | 'CLOSED';

const transitions: Record<WorkStatus, readonly WorkStatus[]> = {
  TODO: ['WORKING', 'BLOCKED'],
  WORKING: ['BLOCKED', 'REVIEW'],
  BLOCKED: ['TODO', 'WORKING'],
  REVIEW: ['WORKING', 'PASS', 'BLOCKED'],
  PASS: ['CLOSED', 'WORKING'],
  CLOSED: ['WORKING'],
};

export interface WorkTransitionResult {
  allowed: boolean;
  reason?: string;
}

export function canTransition(from: WorkStatus, to: WorkStatus): WorkTransitionResult {
  if (from === to) {
    return { allowed: true };
  }

  if (transitions[from].includes(to)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Invalid work status transition: ${from} -> ${to}`,
  };
}

export function transitionWorkStatus(
  from: WorkStatus,
  to: WorkStatus,
  gatePassed = false,
): WorkStatus {
  const result = canTransition(from, to);
  if (!result.allowed) {
    throw new Error(result.reason);
  }

  if (to === 'CLOSED' && !gatePassed) {
    throw new Error('CLOSED requires a passed evidence gate');
  }

  return to;
}
