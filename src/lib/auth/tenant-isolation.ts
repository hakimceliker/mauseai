import { NextRequest, NextResponse } from 'next/server';
import { AuthContext } from './mock-auth';

/**
 * Session store for mock/development authentication
 * In production, this would be backed by Supabase Auth or similar
 *
 * SECURITY: This implementation is for development/testing only.
 * Set DEVELOPMENT=true to use mock auth. Production must use real JWT validation.
 */

export interface SessionToken {
  tenantId: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * In-memory session store (for MVP/single-server only)
 * Production systems should use Supabase Auth or similar
 */
class SessionStore {
  private sessions: Map<string, SessionToken> = new Map();
  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new session token
   */
  createSession(tenantId: string, userId: string): string {
    const token = this.generateToken();
    const now = Date.now();

    this.sessions.set(token, {
      tenantId,
      userId,
      issuedAt: now,
      expiresAt: now + this.SESSION_DURATION_MS,
    });

    return token;
  }

  /**
   * Validate and retrieve session
   */
  getSession(token: string): SessionToken | null {
    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }

  /**
   * Revoke a session
   */
  revokeSession(token: string): void {
    this.sessions.delete(token);
  }

  /**
   * Check if session is still valid (user has access to tenant)
   * In production, this would check user permissions against database
   */
  hasAccessToTenant(token: string, requestedTenantId: string): boolean {
    const session = this.getSession(token);

    if (!session) {
      return false;
    }

    // User can only access their own tenant
    return session.tenantId === requestedTenantId;
  }

  /**
   * Generate a random token
   */
  private generateToken(): string {
    return crypto.getRandomValues(new Uint8Array(32)).reduce(
      (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
      ''
    );
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Get session count (for testing/monitoring)
   */
  getCount(): number {
    return this.sessions.size;
  }
}

// Global session store
const sessionStore = new SessionStore();

/**
 * Extract bearer token from Authorization header
 * Returns token or null
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if development mode is enabled
 * SECURITY: This should only be used for local development
 */
function isDevelopmentMode(): boolean {
  return process.env.DEVELOPMENT === 'true';
}

/**
 * Validate request authentication against session
 *
 * In production (recommended):
 * - Use bearer tokens with JWT verification from Supabase Auth
 * - Validate token signature, expiration, and claims
 * - Check user permissions against database
 *
 * In development (DEVELOPMENT=true):
 * - Create test sessions with createDevSession()
 * - Pass bearer token in Authorization header
 * - Token must match existing session
 */
export function validateTenantAccess(
  request: NextRequest,
  requestedTenantId: string
): { valid: boolean; auth?: AuthContext; error?: string } {
  // Extract bearer token
  const token = extractBearerToken(request);

  if (!token) {
    return {
      valid: false,
      error: 'Invalid authentication',
    };
  }

  // Validate token
  const session = sessionStore.getSession(token);

  if (!session) {
    return {
      valid: false,
      error: 'Invalid authentication',
    };
  }

  // Check user has access to requested tenant
  if (!sessionStore.hasAccessToTenant(token, requestedTenantId)) {
    // Don't reveal whether tenant exists or user permission issue
    return {
      valid: false,
      error: 'Invalid authentication',
    };
  }

  return {
    valid: true,
    auth: {
      tenantId: session.tenantId,
      userId: session.userId,
    },
  };
}

/**
 * Create authenticated request for testing/development
 * SECURITY: Only available when DEVELOPMENT=true
 *
 * Usage:
 * ```typescript
 * const token = createDevSession('tenant-123', 'user-123');
 * const auth = validateTenantAccess(request, 'tenant-123');
 * ```
 */
export function createDevSession(tenantId: string, userId: string): string {
  if (!isDevelopmentMode()) {
    throw new Error('Development sessions only available when DEVELOPMENT=true');
  }

  return sessionStore.createSession(tenantId, userId);
}

/**
 * Revoke a session (useful for logout)
 */
export function revokeSession(token: string): void {
  sessionStore.revokeSession(token);
}

/**
 * Enforce tenant isolation middleware
 *
 * Validates:
 * 1. Request has valid bearer token
 * 2. Token session is active and not expired
 * 3. User has access to the requested tenant
 *
 * Returns 401 for all auth failures (doesn't reveal reason)
 */
export function enforceTenantisolation(handler: (req: NextRequest, auth: AuthContext, tenantId: string) => Promise<NextResponse>) {
  return async (request: NextRequest, tenantId: string): Promise<NextResponse> => {
    try {
      // Validate authentication and tenant access
      const validation = validateTenantAccess(request, tenantId);

      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          { status: 401 }
        );
      }

      // Request is authenticated, proceed to handler
      return handler(request, validation.auth!, tenantId);
    } catch (error) {
      // Don't expose error details
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }
  };
}

/**
 * Auth error handler - returns consistent 401 without exposing details
 */
export function sendAuthError(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
    },
    { status: 401 }
  );
}

/**
 * Log auth failure for monitoring
 * In production, send to observability system (Sentry, DataDog, etc)
 */
export function logAuthFailure(
  reason: string,
  context: { ip?: string; url?: string; headers?: Record<string, string> }
): void {
  if (isDevelopmentMode()) {
    console.warn(`[AUTH FAILURE] ${reason}`, context);
  } else {
    // In production, send to monitoring system
    console.error(`[AUTH FAILURE] ${reason}`, {
      ip: context.ip,
      url: context.url,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Export for testing
 */
export { SessionStore };
export const __testOnly = {
  sessionStore,
  isDevelopmentMode,
};
