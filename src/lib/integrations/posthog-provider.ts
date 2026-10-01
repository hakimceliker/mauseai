import type { EventData, IAnalyticsProvider, PageData, UserProperties } from './analytics-provider';

const ALLOWED_KEYS = new Set([
  'path', 'title', 'referrer', 'role', 'conversion', 'value', 'timestamp',
  'screen', 'action', 'status', 'provider', 'error_code',
]);

function configuredTimeoutMs(): number {
  const parsed = Number.parseInt(process.env.POSTHOG_TIMEOUT_MS || '3000', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 250), 30_000) : 3000;
}

function publicProperties(properties: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => ALLOWED_KEYS.has(key.toLowerCase())),
  );
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), configuredTimeoutMs());
    try {
      await fetch(`${this.host}/capture/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ api_key: this.apiKey, event, distinct_id: distinctId || 'anonymous', properties: publicProperties(properties) }),
      });
    } catch {
      // Analytics must never break the product request.
    } finally {
      clearTimeout(timeout);
    }
  }

  async trackEvent(data: EventData): Promise<void> {
    await this.capture(data.name, data.userId || 'anonymous', { ...data.properties, timestamp: data.timestamp?.toISOString() });
  }

  async trackPage(data: PageData): Promise<void> {
    await this.capture('$pageview', data.userId || 'anonymous', { path: data.path, title: data.title, referrer: data.referrer, ...data.properties });
  }

  async trackUser(properties: UserProperties): Promise<void> {
    await this.capture('$set', properties.userId, { role: properties.role });
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
