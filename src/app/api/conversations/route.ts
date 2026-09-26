import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { ConversationRepository } from '@/src/lib/db/conversation-repository';

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

    return NextResponse.json(
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
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

    return NextResponse.json(
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
