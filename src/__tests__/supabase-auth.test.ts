import { describe, expect, it, afterEach } from 'vitest';
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

  it('does not verify a token when Supabase configuration is absent', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(SupabaseAuth.verifyToken('redacted-test-token')).resolves.toBeNull();
  });
});
