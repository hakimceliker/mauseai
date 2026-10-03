import { afterEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn(() => ({ auth: {} }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('Supabase browser client guard', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
    createClientMock.mockClear();
    vi.resetModules();
  });

  it('never creates a client and surfaces a local config error when Supabase config is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getSupabaseBrowserClient, SUPABASE_CONFIG_ERROR } = await import('@/src/lib/auth/supabase-browser-client');

    expect(getSupabaseBrowserClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(SUPABASE_CONFIG_ERROR).toMatch(/credential_not_configured/);
  });

  it('never creates a client when only one of the two required env vars is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getSupabaseBrowserClient } = await import('@/src/lib/auth/supabase-browser-client');

    expect(getSupabaseBrowserClient()).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('creates a real client only when both env vars are configured', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'real-anon-key';

    const { getSupabaseBrowserClient } = await import('@/src/lib/auth/supabase-browser-client');

    const client = getSupabaseBrowserClient();
    expect(client).not.toBeNull();
    expect(createClientMock).toHaveBeenCalledWith('https://project.supabase.co', 'real-anon-key');
  });
});
