import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/src/lib/supabase/env';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

// Optional client for compatibility. Missing runtime configuration must not
// create a fake client or send traffic to a placeholder endpoint.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Service-side client with admin privileges (server-only)
const serviceRoleKey = getSupabaseServiceRoleKey();

// Never silently downgrade a server/admin client to the anonymous key.
// Callers must use the server-only admin client when privileged access is required.
export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;

// Ensure we're using admin client on server
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('credential_not_configured:SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabaseAdmin;
}
