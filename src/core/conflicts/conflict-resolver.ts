export type ConflictDecision = 'RESOLVED' | 'ESCALATE' | 'REJECTED';

export interface ConflictCandidate<T> {
  sourceId: string;
  result: T;
  evidenceScore: number;
  sourceTrustScore: number;
  acceptanceScore: number;
}

export interface ConflictResolution<T> {
  decision: ConflictDecision;
  selected?: ConflictCandidate<T>;
  reason: string;
}

function score<T>(candidate: ConflictCandidate<T>): number {
  return candidate.evidenceScore + candidate.sourceTrustScore + candidate.acceptanceScore;
}

/**
 * Resolves conflicting agent outputs only when the leading candidate has a
 * clear evidence-backed margin. Ambiguous conflicts are escalated.
 */
export function resolveConflict<T>(candidates: readonly ConflictCandidate<T>[]): ConflictResolution<T> {
  if (candidates.length === 0) {
    return { decision: 'REJECTED', reason: 'no conflict candidates were supplied' };
  }

  const ranked = [...candidates].sort((left, right) => score(right) - score(left));
  const leader = ranked[0];
  const runnerUp = ranked[1];

  if (!runnerUp) {
    return { decision: 'RESOLVED', selected: leader, reason: 'single candidate supplied' };
  }

  const margin = score(leader) - score(runnerUp);
  if (margin < 15 || leader.evidenceScore < 50 || leader.acceptanceScore < 50) {
    return { decision: 'ESCALATE', reason: 'conflict lacks a sufficient evidence-backed margin' };
  }

  return { decision: 'RESOLVED', selected: leader, reason: 'leader has a sufficient evidence-backed margin' };
}
