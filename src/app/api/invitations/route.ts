import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { createMemberInvitation, revokeInvitation } from '@/src/lib/invitations/invitation-service';
import { ValidationError } from '@/src/lib/errors/api-error-handler';
import { ApiErrorHandler } from '@/src/lib/errors/api-error-handler';
import { z } from 'zod';

const CreateInvitationSchema = z.object({ email: z.string().email().max(320) });

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthAsync(request);
    const parsed = CreateInvitationSchema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const result = await createMemberInvitation(auth.tenantId, auth.userId, parsed.data.email);
    const response = process.env.NODE_ENV === 'production' || process.env.AUTH_PROVIDER !== 'mock'
      ? { invitation: result.invitation, delivery: 'pending' }
      : { invitation: result.invitation, token: result.token, delivery: 'test-only' };
    return NextResponse.json({ success: true, data: response }, { status: 201 });
  } catch (error) {
    return ApiErrorHandler.handle(error, { requestPath: request.nextUrl.pathname, method: 'POST' });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthAsync(request);
    const invitationId = request.nextUrl.searchParams.get('id');
    if (!invitationId) throw new ValidationError({ id: ['Required'] });
    const result = await revokeInvitation(auth.tenantId, auth.userId, invitationId);
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    return ApiErrorHandler.handle(error, { requestPath: request.nextUrl.pathname, method: 'DELETE' });
  }
}
