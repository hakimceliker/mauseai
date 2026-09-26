/**
 * Tests for the readiness contract behind GET/HEAD /api/health/ready.
 * Covers the all-ready path and a failure for each dependency
 * (config, database, Supabase auth, Inngest).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getReadiness } from '@/src/lib/health/readiness';
import { GET, HEAD } from '@/app/api/health/ready/route';

const SUPABASE_ENV = {
  AUTH_PROVIDER: 'supabase',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  INNGEST_EVENT_KEY: 'test-event-key',
  INNGEST_SIGNING_KEY: 'test-signing-key',
  ALLOWED_ORIGINS: 'https://app.example.com',
  LOG_LEVEL: 'info',
  LOG_FORMAT: 'json',
};

const okFetch = vi.fn(async () => new Response('{}', { status: 200 }));

describe('getReadiness', () => {
  it('is ready when every dependency is configured and reachable', async () => {
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: okFetch });

    expect(report.ready).toBe(true);
    expect(report.status).toBe('ready');
    expect(report.checks.config.status).toBe('ok');
    expect(report.checks.database.status).toBe('ok');
    expect(report.checks.auth.status).toBe('ok');
    expect(report.checks.inngest.status).toBe('ok');
  });

  it('probes the Supabase REST and auth health endpoints', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    await getReadiness({ env: SUPABASE_ENV, fetch: fetchSpy });

    const urls = fetchSpy.mock.calls.map((call) => (call as unknown[])[0]);
    expect(urls).toContain('https://example.supabase.co/rest/v1/');
    expect(urls).toContain('https://example.supabase.co/auth/v1/health');
  });

  it('is ready in mock mode with nothing configured, marking optional deps skipped', async () => {
    const fetchSpy = vi.fn();
    const report = await getReadiness({ env: {}, fetch: fetchSpy });

    expect(report.ready).toBe(true);
    expect(report.checks.database.status).toBe('skipped');
    expect(report.checks.auth.status).toBe('ok');
    expect(report.checks.inngest.status).toBe('skipped');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails when the database is unreachable', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('/rest/v1/') ? new Response('down', { status: 500 }) : new Response('{}', { status: 200 })
    );
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: fetchFn });

    expect(report.ready).toBe(false);
    expect(report.status).toBe('not_ready');
    expect(report.checks.database).toMatchObject({ status: 'fail', message: 'unreachable (HTTP 500)' });
    expect(report.checks.auth.status).toBe('ok');
  });

  it('fails when the database request errors at the network level', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: fetchFn });

    expect(report.ready).toBe(false);
    expect(report.checks.database).toMatchObject({ status: 'fail', message: 'unreachable (network error)' });
  });

  it('fails with a timeout message when a dependency hangs', async () => {
    const fetchFn = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        })
    );
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: fetchFn, timeoutMs: 20 });

    expect(report.ready).toBe(false);
    expect(report.checks.database.message).toBe('timed out after 20ms');
    expect(report.checks.auth.message).toBe('timed out after 20ms');
  });

  it('fails when Supabase auth is unhealthy', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.includes('/auth/v1/health') ? new Response('bad', { status: 503 }) : new Response('{}', { status: 200 })
    );
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: fetchFn });

    expect(report.ready).toBe(false);
    expect(report.checks.auth).toMatchObject({ status: 'fail', message: 'unreachable (HTTP 503)' });
    expect(report.checks.database.status).toBe('ok');
  });

  it('fails when Supabase auth is selected but not configured', async () => {
    const report = await getReadiness({ env: { AUTH_PROVIDER: 'supabase' }, fetch: okFetch });

    expect(report.ready).toBe(false);
    expect(report.checks.auth.status).toBe('fail');
    expect(report.checks.database.status).toBe('fail');
  });

  it('fails on an unknown auth provider', async () => {
    const report = await getReadiness({ env: { AUTH_PROVIDER: 'ldap' }, fetch: okFetch });

    expect(report.ready).toBe(false);
    expect(report.checks.auth.message).toContain('unknown AUTH_PROVIDER');
  });

  it('fails when Inngest keys are missing on a production deploy', async () => {
    const report = await getReadiness({ env: { VERCEL_ENV: 'production' }, fetch: okFetch });

    expect(report.ready).toBe(false);
    expect(report.checks.inngest).toMatchObject({
      status: 'fail',
      message: 'INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY required in production',
    });
  });

  it('fails when operational config is invalid', async () => {
    const report = await getReadiness({ env: { LOG_LEVEL: 'verbose', ALLOWED_ORIGINS: 'not-a-url' }, fetch: okFetch });

    expect(report.ready).toBe(false);
    expect(report.checks.config.status).toBe('fail');
    expect(report.checks.config.message).toContain('LOG_LEVEL');
    expect(report.checks.config.message).toContain('ALLOWED_ORIGINS');
  });

  it('never echoes credentials in check messages', async () => {
    const fetchFn = vi.fn(async () => new Response('test-service-role-key leaked', { status: 500 }));
    const report = await getReadiness({ env: SUPABASE_ENV, fetch: fetchFn });

    expect(JSON.stringify(report)).not.toContain('test-service-role-key');
    expect(JSON.stringify(report)).not.toContain('test-anon-key');
  });
});

describe('/api/health/ready route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET returns 200 with the readiness report when ready', async () => {
    vi.stubEnv('AUTH_PROVIDER', 'mock');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ready).toBe(true);
    expect(Object.keys(body.checks)).toEqual(['config', 'database', 'auth', 'inngest']);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('GET returns 503 when a dependency fails', async () => {
    vi.stubEnv('AUTH_PROVIDER', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ready).toBe(false);
    expect(body.status).toBe('not_ready');
  });

  it('HEAD mirrors the GET status without a body', async () => {
    vi.stubEnv('AUTH_PROVIDER', 'mock');
    const ok = await HEAD();
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('');

    vi.stubEnv('AUTH_PROVIDER', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const failing = await HEAD();
    expect(failing.status).toBe(503);
  });
});
