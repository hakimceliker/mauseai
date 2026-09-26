import { safeParseConfig } from '@/src/lib/config/validation';

/**
 * Readiness checks for /api/health/ready.
 *
 * Each dependency reports one of:
 * - ok:      configured and reachable
 * - skipped: not configured and not required in the current mode (mock/dev)
 * - fail:    required but misconfigured or unreachable
 *
 * The service is ready only when no check fails. Messages never include
 * credentials or raw upstream error bodies.
 */

export type CheckStatus = 'ok' | 'skipped' | 'fail';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  latencyMs?: number;
}

export interface ReadinessReport {
  ready: boolean;
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    config: CheckResult;
    database: CheckResult;
    auth: CheckResult;
    inngest: CheckResult;
  };
}

type EnvSource = Record<string, string | undefined>;
type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ReadinessDeps {
  env?: EnvSource;
  fetch?: FetchFn;
  timeoutMs?: number;
  now?: () => number;
}

const DEFAULT_TIMEOUT_MS = 3000;

function isSet(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== '';
}

async function probe(
  fetchFn: FetchFn,
  url: string,
  apiKey: string,
  timeoutMs: number,
  now: () => number
): Promise<CheckResult> {
  const started = now();
  try {
    const response = await fetchFn(url, {
      method: 'GET',
      headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    const latencyMs = now() - started;
    if (!response.ok) {
      return { status: 'fail', message: `unreachable (HTTP ${response.status})`, latencyMs };
    }
    return { status: 'ok', message: 'reachable', latencyMs };
  } catch (error) {
    const latencyMs = now() - started;
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return { status: 'fail', message: timedOut ? `timed out after ${timeoutMs}ms` : 'unreachable (network error)', latencyMs };
  }
}

export function checkConfig(env: EnvSource): CheckResult {
  const result = safeParseConfig(env);
  if (result.success) return { status: 'ok', message: 'configuration valid' };
  return { status: 'fail', message: result.issues.join('; ') };
}

export async function checkDatabase(
  env: EnvSource,
  fetchFn: FetchFn,
  timeoutMs: number,
  now: () => number
): Promise<CheckResult> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseRequired = env.AUTH_PROVIDER === 'supabase';

  if (!isSet(url) || !isSet(key)) {
    if (supabaseRequired) {
      return { status: 'fail', message: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when AUTH_PROVIDER=supabase' };
    }
    return { status: 'skipped', message: 'Supabase not configured (mock mode)' };
  }

  // PostgREST root answers only when the database API is up.
  return probe(fetchFn, `${url.replace(/\/+$/, '')}/rest/v1/`, key, timeoutMs, now);
}

export async function checkAuth(
  env: EnvSource,
  fetchFn: FetchFn,
  timeoutMs: number,
  now: () => number
): Promise<CheckResult> {
  const provider = env.AUTH_PROVIDER || 'mock';

  if (provider === 'mock') {
    return { status: 'ok', message: 'mock auth provider active' };
  }
  if (provider !== 'supabase') {
    return { status: 'fail', message: `unknown AUTH_PROVIDER "${provider}" (expected mock or supabase)` };
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!isSet(url) || !isSet(anonKey)) {
    return { status: 'fail', message: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required when AUTH_PROVIDER=supabase' };
  }

  return probe(fetchFn, `${url.replace(/\/+$/, '')}/auth/v1/health`, anonKey, timeoutMs, now);
}

export function checkInngest(env: EnvSource): CheckResult {
  const isProductionDeploy = env.VERCEL_ENV === 'production';
  const hasEventKey = isSet(env.INNGEST_EVENT_KEY);
  const hasSigningKey = isSet(env.INNGEST_SIGNING_KEY);

  if (hasEventKey && hasSigningKey) {
    return { status: 'ok', message: 'event and signing keys configured' };
  }
  if (isProductionDeploy) {
    const missing = [!hasEventKey && 'INNGEST_EVENT_KEY', !hasSigningKey && 'INNGEST_SIGNING_KEY'].filter(Boolean);
    return { status: 'fail', message: `${missing.join(' and ')} required in production` };
  }
  return { status: 'skipped', message: 'Inngest keys not configured (dev/preview mode)' };
}

export async function getReadiness(deps: ReadinessDeps = {}): Promise<ReadinessReport> {
  const env = deps.env ?? process.env;
  const fetchFn = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = deps.now ?? Date.now;

  const [database, auth] = await Promise.all([
    checkDatabase(env, fetchFn, timeoutMs, now),
    checkAuth(env, fetchFn, timeoutMs, now),
  ]);
  const checks = { config: checkConfig(env), database, auth, inngest: checkInngest(env) };
  const ready = Object.values(checks).every((check) => check.status !== 'fail');

  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks,
  };
}
