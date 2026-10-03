import { NextRequest } from 'next/server';
import { AuthError } from '@/src/lib/errors/api-error-handler';
import { SupabaseAuth } from './supabase-auth';

/** Authentication for invitation acceptance before a tenant membership exists. */
export async function requireRequestUserId(request: NextRequest): Promise<string> {
  const provider = (process.env.AUTH_PROVIDER ?? '').toLowerCase() || (process.env.NODE_ENV === 'production' ? 'supabase' : 'mock');
  if (provider === 'mock') {
    const userId = request.headers.get('x-user-id');
    if (!userId) throw new AuthError();
    return userId;
  }
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) throw new AuthError();
  const user = await SupabaseAuth.verifyToken(token);
  if (!user) throw new AuthError();
  return user.id;
}
