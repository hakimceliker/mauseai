import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from './supabase';

export type ConversationState = 'idle' | 'pending' | 'review' | 'approved' | 'completed';

export interface Conversation {
  id: string;
  tenant_id: Domain.TenantId;
  user_id: string;
  state: ConversationState;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Conversation repository for managing conversation state machines
 */
export class ConversationRepository {
  /**
   * Create a new conversation
   */
  static async createConversation(
    tenantId: Domain.TenantId,
    userId: string
  ): Promise<Conversation> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        state: 'idle',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return this.formatConversation(data);
  }

  /**
   * Get a conversation by ID (tenant isolation)
   */
  static async getConversation(
    conversationId: string,
    tenantId: Domain.TenantId
  ): Promise<Conversation | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('conversations')
      .select()
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get conversation: ${error.message}`);
    }

    return data ? this.formatConversation(data) : null;
  }

  /**
   * Transition conversation state (state machine)
   */
  static async transitionState(
    conversationId: string,
    tenantId: Domain.TenantId,
    newState: ConversationState
  ): Promise<Conversation | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('conversations')
      .update({
        state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to transition conversation state: ${error.message}`);
    }

    return data ? this.formatConversation(data) : null;
  }

  /**
   * Get tenant conversations
   */
  static async getTenantConversations(tenantId: Domain.TenantId): Promise<Conversation[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('conversations')
      .select()
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get tenant conversations: ${error.message}`);
    }

    return data.map(c => this.formatConversation(c));
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<Message> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    return this.formatMessage(data);
  }

  /**
   * Get conversation messages
   */
  static async getMessages(conversationId: string): Promise<Message[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('messages')
      .select()
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data.map(m => this.formatMessage(m));
  }

  /**
   * Format database conversation to domain model
   */
  private static formatConversation(data: Record<string, unknown>): Conversation {
    return {
      id: data.id as string,
      tenant_id: data.tenant_id as Domain.TenantId,
      user_id: data.user_id as string,
      state: data.state as ConversationState,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }

  /**
   * Format database message to domain model
   */
  private static formatMessage(data: Record<string, unknown>): Message {
    return {
      id: data.id as string,
      conversation_id: data.conversation_id as string,
      role: data.role as 'user' | 'assistant' | 'system',
      content: data.content as string,
      timestamp: new Date(data.timestamp as string),
    };
  }
}
