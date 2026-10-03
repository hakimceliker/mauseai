import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { requestPrivilege } from '@/src/lib/invitations/invitation-service';
import { ApiErrorHandler, ValidationError } from '@/src/lib/errors/api-error-handler';
import { z } from 'zod';

const schema = z.object({ requested_role: z.enum(['admin', 'owner']) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuthAsync(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const { id } = await context.params;
    const result = await requestPrivilege(auth.tenantId, auth.userId, id, parsed.data.requested_role);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return ApiErrorHandler.handle(error, { requestPath: request.nextUrl.pathname, method: 'POST' });
  }
}
