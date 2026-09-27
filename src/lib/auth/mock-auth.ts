import { NextRequest } from 'next/server';
import * as Domain from '@/src/types/domain';
import { AuthError } from '@/src/lib/errors/api-error-handler';
import { SupabaseAuth } from './supabase-auth';

export interface AuthContext {
  tenantId: Domain.TenantId;
  userId: string;
}

/**
 * Mock authentication context from request headers
 * In Phase 12, this will be replaced with real Supabase Auth
 *
 * Expected headers:
 * - x-tenant-id: the tenant ID
 * - x-user-id: the user ID
 */
export function extractAuthContext(request: NextRequest): AuthContext | null {
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');

  if (!tenantId || !userId) {
    return null;
  }

  return {
    tenantId: tenantId as Domain.TenantId,
    userId,
  };
}

/**
 * Validate that auth context exists
 */
export function requireAuth(request: NextRequest): AuthContext {
  const auth = extractAuthContext(request);
  if (!auth) {
    throw new Error('Unauthorized: missing auth headers');
  }
  return auth;
}

/**
 * Production-aware auth boundary. Mock headers remain available only when
 * AUTH_PROVIDER=mock, preserving local tests without weakening production.
 */
export async function requireAuthAsync(request: NextRequest): Promise<AuthContext> {
  if ((process.env.AUTH_PROVIDER ?? 'mock').toLowerCase() === 'mock') {
    return requireAuth(request);
  }
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const user = token ? await SupabaseAuth.verifyToken(token) : null;
  if (!user) throw new AuthError();
  return { tenantId: user.tenant_id as Domain.TenantId, userId: user.id };
}
