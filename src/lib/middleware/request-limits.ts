import { NextRequest, NextResponse } from 'next/server';

/**
 * Request limits configuration
 */
export interface RequestLimitsConfig {
  maxJsonPayloadBytes: number;
  maxQueryParams: number;
  maxHeaderSizeBytes: number;
}

/**
 * Default request limits
 */
export const DEFAULT_REQUEST_LIMITS: RequestLimitsConfig = {
  maxJsonPayloadBytes: 1024 * 1024, // 1MB
  maxQueryParams: 100,
  maxHeaderSizeBytes: 8192, // 8KB
};

/**
 * Check if request content length exceeds limit
 */
function checkContentLength(
  request: NextRequest,
  limit: number
): { valid: boolean; size: number } {
  const contentLength = request.headers.get('content-length');

  if (!contentLength) {
    return { valid: true, size: 0 };
  }

  const size = parseInt(contentLength, 10);

  if (isNaN(size)) {
    // If content-length is invalid, reject
    return { valid: false, size: 0 };
  }

  return {
    valid: size <= limit,
    size,
  };
}

/**
 * Check header size (sum of all headers)
 */
function checkHeaderSize(request: NextRequest, limit: number): boolean {
  let totalSize = 0;

  // Estimate header size by iterating through headers
  for (const [key, value] of request.headers.entries()) {
    // Each header is approximately: key + ": " + value + "\r\n"
    totalSize += key.length + value.length + 4;
  }

  return totalSize <= limit;
}

/**
 * Check query parameter count
 */
function checkQueryParams(request: NextRequest, maxParams: number): boolean {
  const url = new URL(request.url);
  const paramCount = url.searchParams.size;
  return paramCount <= maxParams;
}

/**
 * Validate all request limits
 */
export function validateRequestLimits(
  request: NextRequest,
  config: RequestLimitsConfig = DEFAULT_REQUEST_LIMITS
): { valid: boolean; error?: string } {
  // Check query parameters
  if (!checkQueryParams(request, config.maxQueryParams)) {
    return {
      valid: false,
      error: `Query parameters exceed limit of ${config.maxQueryParams}`,
    };
  }

  // Check headers size
  if (!checkHeaderSize(request, config.maxHeaderSizeBytes)) {
    return {
      valid: false,
      error: `Headers exceed maximum size of ${config.maxHeaderSizeBytes} bytes`,
    };
  }

  // Check content length (only for methods that have bodies)
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentCheck = checkContentLength(request, config.maxJsonPayloadBytes);

    if (!contentCheck.valid) {
      return {
        valid: false,
        error: `Request body exceeds maximum size of ${config.maxJsonPayloadBytes} bytes (received: ${contentCheck.size} bytes)`,
      };
    }
  }

  return { valid: true };
}

/**
 * Middleware wrapper for request limits validation
 */
export function withRequestLimits(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RequestLimitsConfig = DEFAULT_REQUEST_LIMITS
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Validate request limits
    const validation = validateRequestLimits(request, config);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Request validation failed',
        },
        { status: 413 } // Payload Too Large
      );
    }

    // Request is valid, proceed to handler
    return handler(request);
  };
}

/**
 * Middleware function for request limits
 */
export function requestLimitsMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RequestLimitsConfig
) {
  return withRequestLimits(handler, config || DEFAULT_REQUEST_LIMITS);
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  ...middlewares: ((handler: (req: NextRequest) => Promise<NextResponse>) => (req: NextRequest) => Promise<NextResponse>)[]
) {
  return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
}
