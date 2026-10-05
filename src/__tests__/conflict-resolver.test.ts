import { describe, expect, it } from 'vitest';
import { resolveConflict } from '@/src/core/conflicts/conflict-resolver';

const candidate = (sourceId: string, evidenceScore: number, sourceTrustScore: number, acceptanceScore: number) => ({
  sourceId,
  result: sourceId,
  evidenceScore,
  sourceTrustScore,
  acceptanceScore,
});

describe('conflict resolver', () => {
  it('rejects an empty candidate set', () => {
    expect(resolveConflict([])).toEqual({
      decision: 'REJECTED',
      reason: 'no conflict candidates were supplied',
    });
  });

  it('selects a clearly evidence-backed leader', () => {
    const result = resolveConflict([
      candidate('agent-a', 90, 90, 90),
      candidate('agent-b', 20, 30, 20),
    ]);
    expect(result.decision).toBe('RESOLVED');
    expect(result.selected?.sourceId).toBe('agent-a');
  });

  it('escalates an ambiguous conflict', () => {
    expect(resolveConflict([
      candidate('agent-a', 70, 70, 70),
      candidate('agent-b', 68, 70, 70),
    ]).decision).toBe('ESCALATE');
  });

  it('escalates when the leader lacks evidence or acceptance', () => {
    expect(resolveConflict([
      candidate('agent-a', 40, 95, 95),
      candidate('agent-b', 10, 10, 10),
    ]).decision).toBe('ESCALATE');
  });
});
