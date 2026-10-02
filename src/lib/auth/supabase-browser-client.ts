'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Shown to the user when Supabase Auth env vars are missing. Never reveals credentials. */
export const SUPABASE_CONFIG_ERROR = 'credential_not_configured: Supabase Auth yapılandırması eksik.';

/**
 * Returns a Supabase client only when real configuration is present.
 * Never falls back to a mock/remote endpoint, so credentials are never
 * submitted anywhere when NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are unset.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? createClient(url, anonKey) : null;
}
