import { randomUUID } from 'node:crypto';

export type TraceEventKind = 'task' | 'agent' | 'model' | 'tool' | 'handoff' | 'judge' | 'evidence' | 'approval' | 'recovery';

export interface TraceEvent {
  traceId: string;
  eventId: string;
  kind: TraceEventKind;
  tenantId: string;
  actorId: string;
  entityId: string;
  status: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface TraceSession {
  traceId: string;
  tenantId: string;
  events: TraceEvent[];
}

export function createTraceSession(tenantId: string, traceId: string = randomUUID()): TraceSession {
  if (!tenantId) throw new Error('tenantId is required for an audit trace');
  return { traceId, tenantId, events: [] };
}

export function appendTraceEvent(
  session: TraceSession,
  event: Omit<TraceEvent, 'traceId' | 'eventId' | 'tenantId' | 'occurredAt'> & { tenantId?: string },
  occurredAt = new Date(),
): TraceSession {
  if (event.tenantId && event.tenantId !== session.tenantId) {
    throw new Error('cross-tenant audit event is denied');
  }

  const nextEvent: TraceEvent = {
    ...event,
    traceId: session.traceId,
    eventId: randomUUID(),
    tenantId: session.tenantId,
    occurredAt: occurredAt.toISOString(),
  };

  return { ...session, events: [...session.events, nextEvent] };
}
