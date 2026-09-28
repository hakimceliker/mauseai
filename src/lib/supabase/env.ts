/**
 * Resolve Supabase settings from the canonical MouseAI names first, then
 * from the names emitted by the Vercel Supabase integration.
 *
 * The fallback names are server-side compatibility aliases only. They must
 * never be exposed through a NEXT_PUBLIC_* variable or sent to the client.
 */
export const SUPABASE_URL_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
] as const;

export const SUPABASE_ANON_KEY_ENV_NAMES = [
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

export const SUPABASE_SERVICE_ROLE_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const;

function firstConfigured(names: readonly string[]) {
  return names.find((name) => Boolean(process.env[name]));
}

export function getSupabaseUrl() {
  const name = firstConfigured(SUPABASE_URL_ENV_NAMES);
  return name ? process.env[name] : undefined;
}

export function getSupabaseAnonKey() {
  const name = firstConfigured(SUPABASE_ANON_KEY_ENV_NAMES);
  return name ? process.env[name] : undefined;
}

export function getSupabaseServiceRoleKey() {
  const name = firstConfigured(SUPABASE_SERVICE_ROLE_ENV_NAMES);
  return name ? process.env[name] : undefined;
}

export function missingSupabaseRuntimeEnv() {
  return [
    ...(getSupabaseUrl() ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
    ...(getSupabaseServiceRoleKey() ? [] : ['SUPABASE_SERVICE_ROLE_KEY']),
  ];
}
