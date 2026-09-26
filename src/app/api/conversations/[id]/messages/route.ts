import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { ConversationRepository } from '@/src/lib/db/conversation-repository';
import { z } from 'zod';

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
    const auth = requireAuth(request);

    // Verify conversation exists and belongs to tenant
    const conversation = await ConversationRepository.getConversation(params.id, auth.tenantId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = AddMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validation.error.message}`,
        },
        { status: 400 }
      );
    }

    const message = await ConversationRepository.addMessage(
      params.id,
      validation.data.role,
      validation.data.content
    );

    return NextResponse.json(
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
 * GET /api/conversations/:id/messages
 * Get all messages for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);

    // Verify conversation exists and belongs to tenant
    const conversation = await ConversationRepository.getConversation(params.id, auth.tenantId);

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
