import { NextRequest, NextResponse } from 'next/server';
import { requireRequestUserId } from '@/src/lib/auth/request-user';
import { acceptInvitation } from '@/src/lib/invitations/invitation-service';
import { ApiErrorHandler, ValidationError } from '@/src/lib/errors/api-error-handler';
import { z } from 'zod';

const AcceptInvitationSchema = z.object({ token: z.string().min(32).max(128), email: z.string().email().max(320) });

export async function POST(request: NextRequest) {
  try {
    const userId = await requireRequestUserId(request);
    const parsed = AcceptInvitationSchema.safeParse(await request.json());
    if (!parsed.success) throw new ValidationError(parsed.error.flatten());
    const member = await acceptInvitation(parsed.data.token, userId, parsed.data.email);
    return NextResponse.json({ success: true, data: member }, { status: 200 });
  } catch (error) {
    return ApiErrorHandler.handle(error, { requestPath: request.nextUrl.pathname, method: 'POST' });
  }
}
