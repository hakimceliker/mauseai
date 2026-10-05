import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Supabase configuration fail-closed behavior', () => {
  it('does not create a browser client or auth request without public configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const { getBrowserAuthHeaders } = await import('@/src/lib/auth/browser-session');

    await expect(getBrowserAuthHeaders()).resolves.toEqual({});
  });

  it('requires the service-role credential for privileged database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const { getSupabaseAdmin } = await import('@/src/lib/db/supabase');

    expect(() => getSupabaseAdmin()).toThrow('credential_not_configured:SUPABASE_SERVICE_ROLE_KEY');
  });

  it('uses the canonical error code for the server admin client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    const { getSupabaseAdminClient } = await import('@/src/lib/supabase/admin');

    expect(() => getSupabaseAdminClient()).toThrow(
      'credential_not_configured:SUPABASE_SERVICE_ROLE_KEY',
    );
  });
});
