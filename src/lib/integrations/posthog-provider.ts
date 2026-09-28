import type { EventData, IAnalyticsProvider, PageData, UserProperties } from './analytics-provider';

const PRIVATE_KEYS = new Set(['email', 'name', 'full_name', 'first_name', 'last_name']);

function publicProperties(properties: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => !PRIVATE_KEYS.has(key.toLowerCase())));
}

export class PostHogAnalyticsProvider implements IAnalyticsProvider {
  private readonly apiKey: string;
  private readonly host: string;

  constructor(apiKey = process.env.POSTHOG_KEY || '', host = process.env.POSTHOG_HOST || 'https://app.posthog.com') {
    this.apiKey = apiKey.trim();
    this.host = host.replace(/\/$/, '');
  }

  private async capture(event: string, distinctId: string, properties: Record<string, unknown> = {}): Promise<void> {
    if (!this.apiKey) return;
    try {
      await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey, event, distinct_id: distinctId || 'anonymous', properties: publicProperties(properties) }),
      });
    } catch {
      // Analytics must never break the product request.
    }
  }

  async trackEvent(data: EventData): Promise<void> {
    await this.capture(data.name, data.userId || 'anonymous', { ...data.properties, timestamp: data.timestamp?.toISOString() });
  }

  async trackPage(data: PageData): Promise<void> {
    await this.capture('$pageview', data.userId || 'anonymous', { path: data.path, title: data.title, referrer: data.referrer, ...data.properties });
  }

  async trackUser(properties: UserProperties): Promise<void> {
    await this.capture('$set', properties.userId, { role: properties.role, tenantId: properties.tenantId });
  }

  async trackConversion(name: string, value?: number, properties?: Record<string, unknown>): Promise<void> {
    await this.capture(name, 'anonymous', { ...properties, value, conversion: true });
  }

  async trackError(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    await this.capture('$exception', 'anonymous', { error: typeof error === 'string' ? error : error.message, ...context });
  }

  async isHealthy(): Promise<boolean> {
    return Boolean(this.apiKey);
  }
}
