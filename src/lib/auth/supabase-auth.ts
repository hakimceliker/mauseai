/** Server-side Supabase Auth verification. Never logs or returns credentials. */
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin';

export interface AuthUser {
  id: string;
  email?: string;
  tenant_id: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

export class SupabaseAuth {
  /** Verify the token with Supabase and resolve its server-side tenant membership. */
  static async verifyToken(token: string): Promise<AuthUser | null> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey || !token) return null;

    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const user = (await response.json()) as {
      id?: string;
      email?: string;
    };
    if (!user.id) return null;

    // Tenant membership is authoritative in the server-side users table.
    const admin = getSupabaseAdminClient();
    const { data: profile, error } = await admin
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (error || !profile?.tenant_id) return null;
    return { id: user.id, email: user.email, tenant_id: profile.tenant_id };
  }

  /**
   * Send magic link for passwordless auth
   * In real implementation, this would call Supabase Auth API
   */
  static async sendMagicLink(email: string, tenantId: string): Promise<void> {
    // Stub for Phase 12
    void email; // Stub parameters
    void tenantId;
    console.warn('SupabaseAuth.sendMagicLink is stubbed');
  }

  /**
   * Exchange magic link code for session
   * In real implementation, this would exchange the code for a session token
   */
  static async exchangeMagicLink(code: string): Promise<AuthSession | null> {
    // Stub for Phase 12
    void code; // Stub parameter
    console.warn('SupabaseAuth.exchangeMagicLink is stubbed');
    return null;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<string | null> {
    // Stub for Phase 12
    void refreshToken; // Stub parameter
    console.warn('SupabaseAuth.refreshToken is stubbed');
    return null;
  }

  /**
   * Logout user
   */
  static async logout(accessToken: string): Promise<void> {
    // Stub for Phase 12
    void accessToken; // Stub parameter
    console.warn('SupabaseAuth.logout is stubbed');
  }
}

/**
 * RLS helper: Get current user from auth claims
 * This function would be used in Supabase RLS policies
 * Example policy: WHERE tenant_id = auth.get_tenant_id()
 */
export function getCurrentTenantId(authClaims: Record<string, unknown>): string | null {
  return (authClaims?.tenant_id as string) || null;
}

export function getCurrentUserId(authClaims: Record<string, unknown>): string | null {
  return (authClaims?.sub as string) || null;
}
