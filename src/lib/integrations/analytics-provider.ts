/**
 * Analytics provider interface
 * Supports multiple analytics services: console, Mixpanel, Segment, Amplitude
 * Implementations can be swapped without changing application code
 *
 * Configuration:
 * - ANALYTICS_TYPE: Type of analytics (console, mixpanel, segment, amplitude)
 * - ANALYTICS_API_KEY: API key for provider
 * - NEXT_PUBLIC_ANALYTICS_KEY: Public key for client-side analytics (if needed)
 *
 * Security:
 * - API keys from environment variables only
 * - Never hardcode credentials
 * - Use .env.local for local development (never commit)
 * - Client-side keys can be public (prefixed with NEXT_PUBLIC_)
 */

export interface UserProperties {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export interface EventData {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
}

export interface PageData {
  path: string;
  title?: string;
  referrer?: string;
  properties?: Record<string, unknown>;
  userId?: string;
}

/**
 * Analytics provider interface
 * Track user behavior, events, and page views
 *
 * TODO: Implement event batching for performance
 * TODO: Implement local queueing for offline support
 * TODO: Add error tracking and reporting
 * TODO: Implement session tracking
 * TODO: Add funnel tracking helpers
 */
export interface IAnalyticsProvider {
  /**
   * Track a user event
   * @param data Event information
   *
   * TODO: Validate event data
   * TODO: Add timestamps if not provided
   * TODO: Batch events for efficiency
   * TODO: Handle errors gracefully
   */
  trackEvent(data: EventData): Promise<void>;

  /**
   * Track a page view
   * @param data Page information
   *
   * TODO: Implement page tracking
   * TODO: Capture referrer information
   * TODO: Track path changes in SPAs
   * TODO: Add session tracking
   */
  trackPage(data: PageData): Promise<void>;

  /**
   * Identify or update a user
   * @param properties User identification and properties
   *
   * TODO: Persist user identification
   * TODO: Update user properties on subsequent events
   * TODO: Handle anonymous to identified user transitions
   * TODO: Support custom user properties
   */
  trackUser(properties: UserProperties): Promise<void>;

  /**
   * Track conversion events (purchases, signups, etc.)
   * @param name Conversion name
   * @param value Conversion value (revenue, etc.)
   * @param properties Additional properties
   *
   * TODO: Implement funnel tracking
   * TODO: Track revenue metrics
   * TODO: Track conversion metrics
   */
  trackConversion(
    name: string,
    value?: number,
    properties?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Track errors and exceptions
   * @param error Error object or message
   * @param context Additional context
   *
   * TODO: Implement error tracking
   * TODO: Capture stack traces
   * TODO: Group similar errors
   * TODO: Alert on critical errors
   */
  trackError(error: Error | string, context?: Record<string, unknown>): Promise<void>;

  /**
   * Check if analytics system is healthy
   * @returns true if analytics can receive events
   *
   * TODO: Test provider connectivity
   * TODO: Verify API key validity
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Console analytics provider (development)
 * Logs all events to console instead of sending to analytics
 * Useful for testing and local development
 */
class ConsoleAnalyticsProvider implements IAnalyticsProvider {
  async trackEvent(data: EventData): Promise<void> {
    console.log('[ANALYTICS] Event:', {
      name: data.name,
      userId: data.userId,
      properties: data.properties,
      timestamp: data.timestamp || new Date(),
    });
  }

  async trackPage(data: PageData): Promise<void> {
    console.log('[ANALYTICS] Page view:', {
      path: data.path,
      title: data.title,
      userId: data.userId,
      referrer: data.referrer,
    });
  }

  async trackUser(properties: UserProperties): Promise<void> {
    console.log('[ANALYTICS] User identified:', {
      userId: properties.userId,
      email: properties.email,
      name: properties.name,
      role: properties.role,
      tenantId: properties.tenantId,
    });
  }

  async trackConversion(
    name: string,
    value?: number,
    properties?: Record<string, unknown>
  ): Promise<void> {
    console.log('[ANALYTICS] Conversion:', {
      name,
      value,
      properties,
      timestamp: new Date(),
    });
  }

  async trackError(
    error: Error | string,
    context?: Record<string, unknown>
  ): Promise<void> {
    console.error('[ANALYTICS] Error tracked:', {
      error: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date(),
    });
  }

  async isHealthy(): Promise<boolean> {
    return true; // Console provider always works
  }
}

/**
 * Mixpanel analytics provider
 * TODO: Implement full Mixpanel integration
 */
class MixpanelAnalyticsProvider implements IAnalyticsProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async trackEvent(data: EventData): Promise<void> {
    // TODO: Implement Mixpanel event tracking
    // TODO: Use Mixpanel SDK or HTTP API
    // TODO: Handle batching
    throw new Error('Mixpanel not configured. Set ANALYTICS_API_KEY');
  }

  async trackPage(data: PageData): Promise<void> {
    // TODO: Implement page tracking
    throw new Error('Mixpanel not configured. Set ANALYTICS_API_KEY');
  }

  async trackUser(properties: UserProperties): Promise<void> {
    // TODO: Implement user identification
    throw new Error('Mixpanel not configured. Set ANALYTICS_API_KEY');
  }

  async trackConversion(
    name: string,
    value?: number,
    properties?: Record<string, unknown>
  ): Promise<void> {
    // TODO: Implement conversion tracking
    throw new Error('Mixpanel not configured. Set ANALYTICS_API_KEY');
  }

  async trackError(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    // TODO: Implement error tracking
    console.error('Mixpanel error tracking:', error, context);
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Verify Mixpanel connectivity
    return false;
  }
}

/**
 * Segment analytics provider
 * Segment acts as a hub for multiple analytics destinations
 * TODO: Implement Segment integration
 */
class SegmentAnalyticsProvider implements IAnalyticsProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async trackEvent(data: EventData): Promise<void> {
    // TODO: Implement Segment event tracking
    // TODO: Forward to all configured destinations
    throw new Error('Segment not configured. Set ANALYTICS_API_KEY');
  }

  async trackPage(data: PageData): Promise<void> {
    // TODO: Implement Segment page tracking
    throw new Error('Segment not configured. Set ANALYTICS_API_KEY');
  }

  async trackUser(properties: UserProperties): Promise<void> {
    // TODO: Implement Segment identify
    throw new Error('Segment not configured. Set ANALYTICS_API_KEY');
  }

  async trackConversion(
    name: string,
    value?: number,
    properties?: Record<string, unknown>
  ): Promise<void> {
    // TODO: Implement conversion tracking via Segment
    throw new Error('Segment not configured. Set ANALYTICS_API_KEY');
  }

  async trackError(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    // TODO: Implement error tracking via Segment
    console.error('Segment error tracking:', error, context);
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Verify Segment connectivity
    return false;
  }
}

/**
 * Factory function to create analytics provider
 *
 * Configuration:
 * - ANALYTICS_TYPE: Type (console, mixpanel, segment, amplitude)
 * - ANALYTICS_API_KEY: API key for provider
 *
 * Environment Variable Safety:
 * - Load credentials from environment only
 * - Default to console for development
 * - Warn if production provider without credentials
 *
 * @returns Configured analytics provider
 */
export function createAnalyticsAdapter(): IAnalyticsProvider {
  const analyticsType = (process.env.ANALYTICS_TYPE || 'console').toLowerCase();
  const apiKey = process.env.ANALYTICS_API_KEY || '';

  switch (analyticsType) {
    case 'mixpanel':
      if (!apiKey) {
        console.warn(
          'Mixpanel analytics selected but ANALYTICS_API_KEY not set. ' +
          'Add to .env.local (never commit to git)'
        );
      }
      return new MixpanelAnalyticsProvider(apiKey);

    case 'segment':
      if (!apiKey) {
        console.warn(
          'Segment analytics selected but ANALYTICS_API_KEY not set. ' +
          'Add to .env.local (never commit to git)'
        );
      }
      return new SegmentAnalyticsProvider(apiKey);

    case 'amplitude':
      // TODO: Implement Amplitude provider
      console.warn('Amplitude not yet implemented, using console');
      return new ConsoleAnalyticsProvider();

    case 'console':
    default:
      if (analyticsType !== 'console') {
        console.warn(
          `Unknown analytics type: ${analyticsType}. Defaulting to console provider`
        );
      }
      return new ConsoleAnalyticsProvider();
  }
}

// Singleton instance
let analyticsAdapter: IAnalyticsProvider | null = null;

/**
 * Get or create analytics provider singleton
 * @returns Analytics provider instance
 */
export function getAnalyticsAdapter(): IAnalyticsProvider {
  if (!analyticsAdapter) {
    analyticsAdapter = createAnalyticsAdapter();
  }
  return analyticsAdapter;
}
