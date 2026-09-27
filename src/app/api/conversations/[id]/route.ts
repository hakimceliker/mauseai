import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import {
  ConversationRepository,
  ConversationState,
} from '@/src/lib/db/conversation-repository';
import { z } from 'zod';
import {
  ApiErrorHandler,
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

const TransitionStateSchema = z.object({
  state: z.enum(['idle', 'pending', 'review', 'approved', 'completed']),
});

/**
 * GET /api/conversations/:id
 * Get a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthAsync(request);

    const conversation = await ConversationRepository.getConversation(
      params.id,
      auth.tenantId
    );

    if (!conversation) {
      throw new NotFoundError({ resource: 'conversation', id: params.id });
    }

    const messages = await ConversationRepository.getMessages(params.id);

    const result = NextResponse.json(
      {
        success: true,
        data: {
          id: conversation.id,
          tenant_id: conversation.tenant_id,
          user_id: conversation.user_id,
          state: conversation.state,
          messages: messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          created_at: conversation.created_at.toISOString(),
          updated_at: conversation.updated_at.toISOString(),
        },
      },
      { status: 200 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'GET',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'GET',
    });
  }
}

/**
 * PUT /api/conversations/:id
 * Transition conversation state
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthAsync(request);

    const body = await request.json();
    const validation = TransitionStateSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(validation.error.flatten());
    }

    const conversation = await ConversationRepository.transitionState(
      params.id,
      auth.tenantId,
      validation.data.state as ConversationState
    );

    if (!conversation) {
      throw new NotFoundError({ resource: 'conversation', id: params.id });
    }

    const result = NextResponse.json(
      {
        success: true,
        data: {
          id: conversation.id,
          tenant_id: conversation.tenant_id,
          user_id: conversation.user_id,
          state: conversation.state,
          created_at: conversation.created_at.toISOString(),
          updated_at: conversation.updated_at.toISOString(),
        },
      },
      { status: 200 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'PUT',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'PUT',
    });
  }
}
