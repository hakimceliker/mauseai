import { randomUUID } from 'node:crypto';

export type ObservabilityStatus = 'ready' | 'credential_not_configured' | 'error';
export interface ObservabilityResult { status: ObservabilityStatus; provider: 'sentry' | 'langfuse'; eventId?: string; reason?: string; }
export interface TraceInput { name: string; traceId?: string; userId?: string; tenantId?: string; input?: unknown; output?: unknown; metadata?: Record<string, unknown>; startedAt?: string; endedAt?: string; }

const SENSITIVE_KEY = /(password|secret|token|api[-_]?key|authorization|cookie|private[-_]?key|service[-_]?role)/i;

export function redactTelemetry(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[REDACTED_DEPTH]';
  if (typeof value === 'string') return value.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]').replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_KEY]').replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
  if (Array.isArray(value)) return value.map((item) => redactTelemetry(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactTelemetry(item, depth + 1)]));
  return value;
}

function errorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { type: error.name, message: error.message, stack: error.stack };
  return { type: typeof error, message: String(error) };
}

function sentryEnvelopeUrl(dsn: string): string | undefined {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, '');
    if (!parsed.username || !projectId) return undefined;
    return `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`;
  } catch { return undefined; }
}

export class SentryAdapter {
  async captureException(error: unknown, context: Record<string, unknown> = {}): Promise<ObservabilityResult> {
    const dsn = process.env.SENTRY_DSN?.trim();
    if (!dsn) return { provider: 'sentry', status: 'credential_not_configured' };
    const url = sentryEnvelopeUrl(dsn);
    if (!url) return { provider: 'sentry', status: 'error', reason: 'invalid_dsn' };
    const eventId = randomUUID().replace(/-/g, '');
    const event = { event_id: eventId, platform: 'javascript', timestamp: Date.now() / 1000, exception: { values: [errorDetails(error)] }, extra: redactTelemetry(context) };
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-sentry-envelope' }, body: `${JSON.stringify({ event_id: eventId, dsn, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}` });
      if (!response.ok) return { provider: 'sentry', status: 'error', eventId, reason: `http_${response.status}` };
      return { provider: 'sentry', status: 'ready', eventId };
    } catch { return { provider: 'sentry', status: 'error', eventId, reason: 'network_error' }; }
  }
}

export class LangfuseAdapter {
  async trace(input: TraceInput): Promise<ObservabilityResult> {
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
    const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
    if (!publicKey || !secretKey) return { provider: 'langfuse', status: 'credential_not_configured' };
    const baseUrl = (process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/$/, '');
    const payload = { batch: [{ id: input.traceId || randomUUID(), type: 'generation-create', timestamp: input.startedAt || new Date().toISOString(), body: { name: input.name, traceId: input.traceId, userId: input.userId, sessionId: input.tenantId, input: redactTelemetry(input.input), output: redactTelemetry(input.output), metadata: redactTelemetry(input.metadata), endTime: input.endedAt } }] };
    try {
      const auth = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
      const response = await fetch(`${baseUrl}/api/public/ingestion`, { method: 'POST', headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) return { provider: 'langfuse', status: 'error', reason: `http_${response.status}` };
      return { provider: 'langfuse', status: 'ready' };
    } catch { return { provider: 'langfuse', status: 'error', reason: 'network_error' }; }
  }
}

export class Observability {
  readonly sentry = new SentryAdapter();
  readonly langfuse = new LangfuseAdapter();
  async reportException(error: unknown, context?: Record<string, unknown>): Promise<ObservabilityResult[]> { return [await this.sentry.captureException(error, context)]; }
  async reportTrace(input: TraceInput): Promise<ObservabilityResult[]> { return [await this.langfuse.trace(input)]; }
}

export const observability = new Observability();
