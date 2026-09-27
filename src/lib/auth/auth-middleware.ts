import { NextRequest, NextResponse } from 'next/server';
import { extractAuthContext, AuthContext, requireAuthAsync } from './mock-auth';

/**
 * Auth middleware for verifying tenant and user context
 * Phase 12: Prepare for Supabase Auth, currently using mock auth headers
 */
export interface MiddlewareContext {
  auth: AuthContext;
}

/**
 * Middleware to extract and verify auth context
 * In Phase 12+, this will verify JWT tokens from Supabase Auth
 */
export function authMiddleware(handler: (req: NextRequest, ctx: MiddlewareContext) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const auth = await requireAuthAsync(request).catch(() => null);

      if (!auth) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: missing or invalid auth context',
          },
          { status: 401 }
        );
      }

      // Verify tenant_id format (should be non-empty)
      if (!auth.tenantId || auth.tenantId.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: invalid tenant context',
          },
          { status: 401 }
        );
      }

      // Verify user_id format
      if (!auth.userId || auth.userId.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized: invalid user context',
          },
          { status: 401 }
        );
      }

      return handler(request, { auth });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication error';
      return NextResponse.json(
        {
          success: false,
          error: message,
        },
        { status: 401 }
      );
    }
  };
}

/**
 * Verify that a request has valid auth context
 * Returns auth or throws error
 */
export function verifyAuth(request: NextRequest): AuthContext {
  const auth = extractAuthContext(request);
  if (!auth) {
    throw new Error('Unauthorized: missing auth context');
  }
  return auth;
}

/**
 * Check if user belongs to tenant
 * (In a real system, this would verify JWT claims)
 */
export function isTenantUser(tenantId: string, authTenantId: string): boolean {
  return tenantId === authTenantId;
}

/**
 * Enforce tenant isolation on data access
 */
export function enforceTenantisolation(requestedTenantId: string, authTenantId: string): boolean {
  return requestedTenantId === authTenantId;
}
