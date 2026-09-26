/**
 * Supabase Auth integration (Phase 12+)
 * Currently stubbed for future integration with real Supabase Auth
 *
 * In Phase 12+, this will:
 * - Verify JWT tokens from Supabase Auth
 * - Support magic link authentication
 * - Manage user sessions
 * - Enforce RLS policies via auth claims
 */

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

/**
 * Mock implementation for Phase 12 (will be replaced with real Supabase Auth)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class SupabaseAuth {
  /**
   * Verify a JWT token and extract claims
   * In real implementation, this would verify the Supabase JWT
   */
  static async verifyToken(token: string): Promise<AuthUser | null> {
    // Stub for Phase 12
    // In real implementation:
    // 1. Verify JWT signature with Supabase public key
    // 2. Decode claims
    // 3. Return user context with tenant_id
    void token; // Stub parameter
    console.warn('SupabaseAuth.verifyToken is stubbed - using mock auth');
    return null;
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
