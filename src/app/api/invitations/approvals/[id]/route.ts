import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { approvePrivilege } from '@/src/lib/invitations/invitation-service';
import { ApiErrorHandler } from '@/src/lib/errors/api-error-handler';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuthAsync(request);
    const { id } = await context.params;
    const result = await approvePrivilege(auth.tenantId, auth.userId, id);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return ApiErrorHandler.handle(error, { requestPath: request.nextUrl.pathname, method: 'POST' });
  }
}
