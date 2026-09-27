import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { ConversationRepository } from '@/src/lib/db/conversation-repository';
import { z } from 'zod';
import {
  ApiErrorHandler,
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

const AddMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

/**
 * POST /api/conversations/:id/messages
 * Add a message to a conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthAsync(request);

    // Verify conversation exists and belongs to tenant
    const conversation = await ConversationRepository.getConversation(params.id, auth.tenantId);

    if (!conversation) {
      throw new NotFoundError({ resource: 'conversation', id: params.id });
    }

    const body = await request.json();
    const validation = AddMessageSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(validation.error.flatten());
    }

    const message = await ConversationRepository.addMessage(
      params.id,
      validation.data.role,
      validation.data.content
    );

    const result = NextResponse.json(
      {
        success: true,
        data: {
          id: message.id,
          conversation_id: message.conversation_id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
        },
      },
      { status: 201 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'POST',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'POST',
    });
  }
}

/**
 * GET /api/conversations/:id/messages
 * Get all messages for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuthAsync(request);

    // Verify conversation exists and belongs to tenant
    const conversation = await ConversationRepository.getConversation(params.id, auth.tenantId);

    if (!conversation) {
      throw new NotFoundError({ resource: 'conversation', id: params.id });
    }

    const messages = await ConversationRepository.getMessages(params.id);

    const result = NextResponse.json(
      {
        success: true,
        data: messages.map(m => ({
          id: m.id,
          conversation_id: m.conversation_id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
        })),
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
