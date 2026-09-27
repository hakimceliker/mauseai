'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mock.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'mock-anon-key';
const browserSupabase = createClient(url, key);

export async function getBrowserAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await browserSupabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}
