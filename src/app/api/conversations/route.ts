import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { ConversationRepository } from '@/src/lib/db/conversation-repository';
import {
  ApiErrorHandler,
  AuthError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

/**
 * POST /api/conversations
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);

    const conversation = await ConversationRepository.createConversation(
      auth.tenantId,
      auth.userId
    );

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
 * GET /api/conversations
 * List conversations for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);

    const conversations = await ConversationRepository.getTenantConversations(auth.tenantId);

    const result = NextResponse.json(
      {
        success: true,
        data: conversations.map(c => ({
          id: c.id,
          tenant_id: c.tenant_id,
          user_id: c.user_id,
          state: c.state,
          created_at: c.created_at.toISOString(),
          updated_at: c.updated_at.toISOString(),
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
