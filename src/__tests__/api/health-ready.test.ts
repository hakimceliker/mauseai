import { describe, expect, it, vi } from 'vitest';
import { GET, HEAD } from '@/src/app/api/health/ready/route';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
});

vi.mock('@/src/lib/supabase/admin', () => ({
  getSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ error: null, count: 0 }),
    })),
  })),
}));

describe('/api/health/ready', () => {
  it('returns ready for GET when the database is reachable', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ready: true });
  });

  it('returns an empty successful HEAD response', async () => {
    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('does not expose secret values when configuration is missing', async () => {
    const savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const savedServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const response = await GET();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ready: false });
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl;
      process.env.SUPABASE_SERVICE_ROLE_KEY = savedServiceRoleKey;
    }
  });
});
