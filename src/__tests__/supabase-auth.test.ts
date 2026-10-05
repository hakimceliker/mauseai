import { describe, expect, it, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AuthError } from '@/src/lib/errors/api-error-handler';
import { requireAuthAsync, resolveAuthProvider } from '@/src/lib/auth/mock-auth';
import { SupabaseAuth } from '@/src/lib/auth/supabase-auth';

vi.mock('@/src/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-from-membership' }, error: null }),
        })),
      })),
    })),
  })),
}));

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

  it('fails closed when the Supabase Auth network call fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));

    await expect(SupabaseAuth.verifyToken('redacted-test-token')).resolves.toBeNull();
  });

  it('uses server-side tenant membership instead of trusting JWT tenant metadata', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'auth-user-1',
      email: 'user@example.test',
      app_metadata: { tenant_id: 'tenant-from-jwt' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(SupabaseAuth.verifyToken('redacted-test-token')).resolves.toEqual({
      id: 'auth-user-1',
      email: 'user@example.test',
      tenant_id: 'tenant-from-membership',
    });
  });

  it('uses Supabase as the production default across route decisions', () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.AUTH_PROVIDER;

    expect(resolveAuthProvider()).toBe('supabase');
  });
});
