import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin';
import { missingSupabaseRuntimeEnv } from '@/src/lib/supabase/env';

async function readinessResponse() {
  try {
    if (missingSupabaseRuntimeEnv().length > 0) {
      throw new Error('credential_not_configured');
    }

    const { error } = await getSupabaseAdminClient()
      .from('tenants')
      .select('id', { head: true, count: 'exact' });

    if (error) throw error;

    const response = NextResponse.json({ ready: true }, { status: 200 });
    addSecurityHeaders(response);
    return response;
  } catch {
    const response = NextResponse.json({ ready: false }, { status: 503 });
    addSecurityHeaders(response);
    return response;
  }
}

/** Readiness probe used by deployment and orchestration platforms. */
export async function GET() {
  return readinessResponse();
}

export async function HEAD() {
  const response = await readinessResponse();
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
