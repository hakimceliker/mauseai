import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client (for browser, service role handled separately)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service-side client with admin privileges (server-only)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

// Ensure we're using admin client on server
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role key not configured');
  }
  return supabaseAdmin;
}
