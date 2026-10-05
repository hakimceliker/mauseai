import { describe, expect, it } from 'vitest';
import { appendTraceEvent, createTraceSession } from '@/src/core/audit/trace-manager';

describe('trace manager', () => {
  it('creates one tenant-scoped trace and links events to it', () => {
    const session = createTraceSession('tenant-a', 'trace-1');
    const next = appendTraceEvent(session, {
      kind: 'task',
      actorId: 'user-1',
      entityId: 'task-1',
      status: 'WORKING',
    }, new Date('2026-10-04T08:00:00.000Z'));
    expect(next.traceId).toBe('trace-1');
    expect(next.events[0]).toMatchObject({
      traceId: 'trace-1',
      tenantId: 'tenant-a',
      kind: 'task',
      occurredAt: '2026-10-04T08:00:00.000Z',
    });
  });

  it('rejects cross-tenant events', () => {
    const session = createTraceSession('tenant-a', 'trace-1');
    expect(() => appendTraceEvent(session, {
      kind: 'tool',
      actorId: 'agent-1',
      entityId: 'tool-1',
      status: 'DENY',
      tenantId: 'tenant-b',
    })).toThrow('cross-tenant audit event is denied');
  });

  it('preserves event order and immutable prior sessions', () => {
    const session = createTraceSession('tenant-a', 'trace-1');
    const first = appendTraceEvent(session, { kind: 'task', actorId: 'user-1', entityId: 'task-1', status: 'WORKING' });
    const second = appendTraceEvent(first, { kind: 'judge', actorId: 'judge-1', entityId: 'task-1', status: 'REVIEW' });
    expect(session.events).toHaveLength(0);
    expect(first.events).toHaveLength(1);
    expect(second.events.map((event) => event.kind)).toEqual(['task', 'judge']);
  });
});
