import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import {
  ConversationRepository,
  ConversationState,
} from '@/src/lib/db/conversation-repository';
import { z } from 'zod';

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
    const auth = requireAuth(request);

    const conversation = await ConversationRepository.getConversation(
      params.id,
      auth.tenantId
    );

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found',
        },
        { status: 404 }
      );
    }

    const messages = await ConversationRepository.getMessages(params.id);

    return NextResponse.json(
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
 * PUT /api/conversations/:id
 * Transition conversation state
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);

    const body = await request.json();
    const validation = TransitionStateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validation.error.message}`,
        },
        { status: 400 }
      );
    }

    const conversation = await ConversationRepository.transitionState(
      params.id,
      auth.tenantId,
      validation.data.state as ConversationState
    );

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found',
        },
        { status: 404 }
      );
    }

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
