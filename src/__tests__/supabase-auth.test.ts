import { describe, expect, it, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthError } from '@/src/lib/errors/api-error-handler';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { SupabaseAuth } from '@/src/lib/auth/supabase-auth';

describe('Supabase production auth boundary', () => {
  const originalProvider = process.env.AUTH_PROVIDER;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.AUTH_PROVIDER = originalProvider;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
  });

  it('keeps local mock auth behavior explicit', async () => {
    process.env.AUTH_PROVIDER = 'mock';
    const request = new NextRequest('http://localhost/api/tasks', {
      headers: { 'x-tenant-id': 'tenant-1', 'x-user-id': 'user-1' },
    });
    await expect(requireAuthAsync(request)).resolves.toEqual({ tenantId: 'tenant-1', userId: 'user-1' });
  });

  it('rejects production mode without a bearer token', async () => {
    process.env.AUTH_PROVIDER = 'supabase';
    const request = new NextRequest('http://localhost/api/tasks');
    await expect(requireAuthAsync(request)).rejects.toBeInstanceOf(AuthError);
  });

  it('rejects mock auth when production is explicitly configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.AUTH_PROVIDER = 'mock';
    const request = new NextRequest('http://localhost/api/tasks', {
      headers: { 'x-tenant-id': 'tenant-1', 'x-user-id': 'user-1' },
    });
    await expect(requireAuthAsync(request)).rejects.toBeInstanceOf(AuthError);
  });

  it('does not verify a token when Supabase configuration is absent', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(SupabaseAuth.verifyToken('redacted-test-token')).resolves.toBeNull();
  });

  it('uses the server-side tenant membership instead of user-controlled metadata', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/v1/user')) {
        return new Response(JSON.stringify({
          id: 'user-1',
          email: 'user@example.test',
          app_metadata: { tenant_id: 'stale-tenant' },
          user_metadata: { tenant_id: 'attacker-tenant' },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes('/rest/v1/users')) {
        return new Response(JSON.stringify([{ tenant_id: 'authoritative-tenant' }]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(SupabaseAuth.verifyToken('redacted-test-token')).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.test',
      tenant_id: 'authoritative-tenant',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
