/**
 * Middleware integration layer
 * Provides composable middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthContext } from '../auth/mock-auth';
import { withRateLimit, RateLimitConfig, DEFAULT_RATE_LIMIT_CONFIG } from './rate-limit';
import { withRequestLimits, RequestLimitsConfig, DEFAULT_REQUEST_LIMITS } from './request-limits';

/**
 * Middleware composition function
 * Applies multiple middleware in sequence
 */
export function withMiddleware(
  handler: (req: NextRequest, auth?: AuthContext) => Promise<NextResponse>,
  middleware: {
    rateLimit?: RateLimitConfig;
    requestLimits?: RequestLimitsConfig;
  } = {}
) {
  const requestLimitsConfig = middleware.requestLimits || DEFAULT_REQUEST_LIMITS;
  const rateLimitConfig = middleware.rateLimit || DEFAULT_RATE_LIMIT_CONFIG;

  // Apply both request limits and rate limiting middleware
  const wrappedHandler = (req: NextRequest, auth?: AuthContext) => {
    // First apply request limits (fail fast on invalid requests)
    const withLimits = withRequestLimits(
      async (r) => handler(r, auth),
      requestLimitsConfig
    );

    // Then apply rate limiting
    return withRateLimit(
      async (r) => withLimits(r),
      rateLimitConfig
    )(req, auth);
  };

  return wrappedHandler;
}

/**
 * Create a protected API handler with auth and security middleware
 * Usage:
 * ```typescript
 * export const POST = withSecuredHandler(async (req, auth) => {
 *   // Your handler code
 * });
 * ```
 */
export function withSecuredHandler(
  handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>,
  options: {
    rateLimit?: RateLimitConfig;
    requestLimits?: RequestLimitsConfig;
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      // First apply security middleware
      const securedHandler = withMiddleware(
        async (req, auth) => {
          if (!auth) {
            return NextResponse.json(
              { success: false, error: 'Unauthorized' },
              { status: 401 }
            );
          }
          return handler(req, auth);
        },
        options
      );

      return await securedHandler(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a public API handler with rate limiting and request limits
 * No authentication required
 * Usage:
 * ```typescript
 * export const GET = withPublicHandler(async (req) => {
 *   // Your handler code
 * });
 * ```
 */
export function withPublicHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: {
    rateLimit?: RateLimitConfig;
    requestLimits?: RequestLimitsConfig;
  } = {}
) {
  return async (request: NextRequest) => {
    try {
      // Apply middleware without requiring auth
      const publicHandler = withMiddleware(
        async (req) => handler(req),
        options
      );

      return await publicHandler(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  };
}

export type { RateLimitConfig, RequestLimitsConfig };
export { DEFAULT_RATE_LIMIT_CONFIG, DEFAULT_REQUEST_LIMITS };
