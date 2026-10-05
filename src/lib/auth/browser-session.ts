'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const browserSupabase = url && key ? createClient(url, key) : null;

export async function getBrowserAuthHeaders(): Promise<Record<string, string>> {
  if (!browserSupabase) return {};
  const { data } = await browserSupabase.auth.getSession();
  return data.session?.access_token
    ? { Authorization: `Bearer ${data.session.access_token}` }
    : {};
}
