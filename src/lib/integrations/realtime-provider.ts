import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export interface RealtimeMessage {
  channel: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface RealtimeSubscription {
  channel: string;
  unsubscribe(): void;
  onMessage(callback: (message: RealtimeMessage) => void): void;
}

export interface IRealtimeProvider {
  connect(): Promise<void>;
  subscribe(channel: string, eventFilter?: string): Promise<RealtimeSubscription>;
  unsubscribe(channel: string): void;
  broadcast(channel: string, event: string, data: Record<string, unknown>): Promise<void>;
  emit(event: string, data: Record<string, unknown>): Promise<void>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

type SubscriptionState = {
  channel: RealtimeChannel;
  callback?: (message: RealtimeMessage) => void;
};

/** Supabase Realtime implementation for client-side task updates. */
export class SupabaseRealtimeProvider implements IRealtimeProvider {
  private connected = false;
  private client: SupabaseClient | null = null;
  private subscriptions = new Map<string, SubscriptionState>();

  private getClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('credential_not_configured:NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (not configured)');
    }
    if (!this.client) this.client = createClient(url, key, { auth: { persistSession: false } });
    return this.client;
  }

  async connect(): Promise<void> {
    this.getClient();
    this.connected = true;
  }

  async subscribe(channelName: string, eventFilter?: string): Promise<RealtimeSubscription> {
    if (!channelName.trim()) throw new Error('VALIDATION:realtime channel is required');
    await this.connect();
    this.unsubscribe(channelName);

    const channel = this.getClient()
      .channel(channelName)
      .on(
        'broadcast',
        { event: eventFilter || '*' },
        (payload: { event?: string; payload?: Record<string, unknown> }) => {
          const state = this.subscriptions.get(channelName);
          state?.callback?.({
            channel: channelName,
            event: payload.event || eventFilter || 'broadcast',
            data: payload.payload || {},
            timestamp: new Date(),
          });
        },
      );

    await new Promise<void>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') resolve();
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error('REALTIME_SUBSCRIPTION_FAILED'));
        }
      });
    });

    this.subscriptions.set(channelName, { channel });
    return {
      channel: channelName,
      unsubscribe: () => this.unsubscribe(channelName),
      onMessage: (callback) => {
        const state = this.subscriptions.get(channelName);
        if (state) state.callback = callback;
      },
    };
  }

  unsubscribe(channelName: string): void {
    const state = this.subscriptions.get(channelName);
    if (state && this.client) void this.client.removeChannel(state.channel);
    this.subscriptions.delete(channelName);
  }

  async broadcast(channelName: string, event: string, data: Record<string, unknown>): Promise<void> {
    if (!event.trim()) throw new Error('VALIDATION:realtime event is required');
    await this.connect();
    const existing = this.subscriptions.get(channelName);
    const channel = existing?.channel || this.getClient().channel(channelName);
    if (!existing) this.subscriptions.set(channelName, { channel });
    const status = await channel.send({ type: 'broadcast', event, payload: data });
    if (status !== 'ok') throw new Error('REALTIME_BROADCAST_FAILED');
  }

  async emit(event: string, data: Record<string, unknown>): Promise<void> {
    await this.broadcast('system', event, data);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await Promise.all(
        [...this.subscriptions.values()].map(({ channel }) => this.client?.removeChannel(channel)),
      );
    }
    this.subscriptions.clear();
    this.connected = false;
    this.client = null;
  }
}

export function getRealtimeProvider(): IRealtimeProvider {
  return new SupabaseRealtimeProvider();
}
