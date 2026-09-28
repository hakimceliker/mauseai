import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

// Client-side Supabase client (for browser, service role handled separately)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service-side client with admin privileges (server-only)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Never silently downgrade a server/admin client to the anonymous key.
// Callers must use the server-only admin client when privileged access is required.
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

// Ensure we're using admin client on server
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('credential_not_configured:SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabaseAdmin;
}
