import { NextRequest, NextResponse } from 'next/server';
import { AuthContext } from '../auth/mock-auth';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  unauthenticatedLimitPerMin: number;
  authenticatedLimitPerMin: number;
}

/**
 * Request record for sliding window tracking
 */
interface RequestRecord {
  timestamp: number;
}

/**
 * In-memory store for rate limiting
 * Uses a simple sliding window approach
 * NOTE: This is suitable for single-server MVP. For distributed systems,
 * use Redis or similar external store.
 */
class RateLimitStore {
  private store: Map<string, RequestRecord[]> = new Map();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Record a request and check if rate limit is exceeded
   * Returns true if request should be allowed, false if rate limit exceeded
   */
  isAllowed(key: string, limit: number): boolean {
    const now = Date.now();
    const records = this.store.get(key) || [];

    // Remove old records outside the window
    const validRecords = records.filter(r => now - r.timestamp < this.WINDOW_MS);

    // Check if limit exceeded
    if (validRecords.length >= limit) {
      return false;
    }

    // Add new request record
    validRecords.push({ timestamp: now });
    this.store.set(key, validRecords);

    return true;
  }

  /**
   * Get current request count for a key
   */
  getCount(key: string): number {
    const now = Date.now();
    const records = this.store.get(key) || [];
    return records.filter(r => now - r.timestamp < this.WINDOW_MS).length;
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, records] of this.store.entries()) {
      const validRecords = records.filter(r => now - r.timestamp < this.WINDOW_MS);
      if (validRecords.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, validRecords);
      }
    }
  }

  /**
   * Reset a key (useful for testing)
   */
  reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  unauthenticatedLimitPerMin: 100,
  authenticatedLimitPerMin: 1000,
};

/**
 * Get the client IP address from request
 * Checks X-Forwarded-For header (for proxies) and falls back to socket address
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // For Next.js App Router, try to get from socket via ip property
  // @ts-expect-error - ip property may not be available in all contexts
  const ip = (request.ip || 'unknown');
  return ip;
}

/**
 * Rate limiting middleware with sliding window
 * Per-IP for unauthenticated requests
 * Per-tenant for authenticated requests
 */
export function withRateLimit(
  handler: (req: NextRequest, auth?: AuthContext) => Promise<NextResponse>,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG
) {
  return async (request: NextRequest, auth?: AuthContext) => {
    try {
      let rateLimitKey: string;
      let limit: number;

      if (auth) {
        // Authenticated request - rate limit per tenant
        rateLimitKey = `tenant:${auth.tenantId}`;
        limit = config.authenticatedLimitPerMin;
      } else {
        // Unauthenticated request - rate limit per IP
        const clientIp = getClientIp(request);
        rateLimitKey = `ip:${clientIp}`;
        limit = config.unauthenticatedLimitPerMin;
      }

      // Check rate limit
      if (!rateLimitStore.isAllowed(rateLimitKey, limit)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests',
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
            },
          }
        );
      }

      // Request allowed, proceed to handler
      return handler(request, auth);
    } catch {
      // On error, let it through (don't fail-closed on rate limit)
      return handler(request, auth);
    }
  };
}

/**
 * Middleware wrapper for rate limiting
 * Used in API route handlers
 */
export function rateLimitMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withRateLimit(
      async (req) => handler(req),
      config || DEFAULT_RATE_LIMIT_CONFIG
    )(request);
  };
}

/**
 * Export for testing
 */
export { RateLimitStore };
