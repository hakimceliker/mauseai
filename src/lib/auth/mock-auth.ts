import { NextRequest } from 'next/server';
import * as Domain from '@/src/types/domain';

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
