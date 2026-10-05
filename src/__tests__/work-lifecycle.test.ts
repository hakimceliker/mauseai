import { describe, expect, it } from 'vitest';
import { canTransition, transitionWorkStatus } from '@/src/core/status/work-lifecycle';

describe('canonical work lifecycle', () => {
  it('allows the normal execution path', () => {
    expect(canTransition('TODO', 'WORKING')).toEqual({ allowed: true });
    expect(canTransition('WORKING', 'REVIEW')).toEqual({ allowed: true });
    expect(canTransition('REVIEW', 'PASS')).toEqual({ allowed: true });
  });

  it('allows recovery from blocked work', () => {
    expect(canTransition('BLOCKED', 'WORKING')).toEqual({ allowed: true });
  });

  it('rejects skipping review and pass', () => {
    const result = canTransition('WORKING', 'CLOSED');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('WORKING -> CLOSED');
  });

  it('requires a passed evidence gate to close', () => {
    expect(() => transitionWorkStatus('PASS', 'CLOSED')).toThrow(
      'CLOSED requires a passed evidence gate',
    );
    expect(transitionWorkStatus('PASS', 'CLOSED', true)).toBe('CLOSED');
  });
});
