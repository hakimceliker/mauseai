import { NextResponse } from 'next/server';

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Strict-Transport-Security: Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content-Security-Policy: Prevent XSS and injection attacks
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent XSS in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy: Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Feature Policy / Permissions Policy
  'Permissions-Policy':
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',

  // Remove X-Powered-By header
  'X-Powered-By': undefined,
};

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
  // Allowed origins (configure via environment variables for production)
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Allowed methods
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],

  // Exposed headers
  exposedHeaders: ['Content-Length', 'X-Request-Id'],

  // Allow credentials
  credentials: true,

  // Max age for preflight cache (in seconds)
  maxAge: 86400,
};

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value !== undefined) {
      response.headers.set(key, value);
    }
  });

  return response;
}

/**
 * Handle CORS for API routes
 */
export function handleCors(
  origin: string | undefined,
  method: string
): { headers: Record<string, string>; shouldAllowRequest: boolean } {
  // Check if origin is allowed
  const isAllowedOrigin =
    !origin ||
    CORS_CONFIG.allowedOrigins.includes(origin) ||
    CORS_CONFIG.allowedOrigins.includes('*');

  if (!isAllowedOrigin) {
    return {
      headers: {},
      shouldAllowRequest: false,
    };
  }

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return {
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': CORS_CONFIG.allowedMethods.join(', '),
        'Access-Control-Allow-Headers': CORS_CONFIG.allowedHeaders.join(', '),
        'Access-Control-Expose-Headers': CORS_CONFIG.exposedHeaders.join(', '),
        'Access-Control-Allow-Credentials': String(CORS_CONFIG.credentials),
        'Access-Control-Max-Age': String(CORS_CONFIG.maxAge),
      },
      shouldAllowRequest: true,
    };
  }

  // For actual requests
  return {
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': String(CORS_CONFIG.credentials),
      'Access-Control-Expose-Headers': CORS_CONFIG.exposedHeaders.join(', '),
    },
    shouldAllowRequest: true,
  };
}

/**
 * Create a response with CORS headers
 */
export function createCorsResponse(
  origin: string | undefined,
  data: unknown,
  status: number = 200
): NextResponse {
  const cors = handleCors(origin, 'GET');

  if (!cors.shouldAllowRequest) {
    // Return error response without CORS headers
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CORS_ERROR',
          message: 'CORS policy violation',
          id: 'cors-error',
        },
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json(data, { status });

  // Add CORS headers
  Object.entries(cors.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add security headers
  addSecurityHeaders(response);

  return response;
}
