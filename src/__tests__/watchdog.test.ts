import { describe, expect, it } from 'vitest';
import { inspectTaskHealth } from '@/src/core/watchdog/watchdog';

const base = {
  status: 'WORKING' as const,
  lastActivityAt: new Date('2026-10-04T08:00:00.000Z'),
  now: new Date('2026-10-04T08:01:00.000Z'),
  staleAfterMs: 120_000,
  blockedAfterMs: 300_000,
  retryCount: 0,
  maxRetries: 3,
};

describe('watchdog', () => {
  it('keeps recently active work healthy', () => {
    expect(inspectTaskHealth(base).state).toBe('HEALTHY');
  });

  it('requeues stale work while retries remain', () => {
    expect(inspectTaskHealth({ ...base, now: new Date('2026-10-04T08:03:00.000Z') })).toMatchObject({
      state: 'STALE',
      shouldRequeue: true,
      shouldEscalate: false,
    });
  });

  it('blocks and escalates stale work after retry exhaustion', () => {
    expect(inspectTaskHealth({
      ...base,
      now: new Date('2026-10-04T08:03:00.000Z'),
      retryCount: 3,
    })).toMatchObject({
      state: 'BLOCKED',
      shouldRequeue: false,
      shouldEscalate: true,
    });
  });

  it('escalates an old explicitly blocked task', () => {
    expect(inspectTaskHealth({
      ...base,
      status: 'BLOCKED',
      now: new Date('2026-10-04T08:06:00.000Z'),
    }).state).toBe('ESCALATE');
  });
});
