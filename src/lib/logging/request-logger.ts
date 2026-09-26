/**
 * Request logging middleware for HTTP requests
 * Logs all requests with method, path, status, duration, and user context
 * Skips health checks to reduce noise
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { StructuredLogger, type LogContext } from './structured-logger';

export interface RequestLogContext extends LogContext {
  method: string;
  path: string;
  duration?: number;
  statusCode?: number;
  requestId: string;
  userId?: string;
  tenantId?: string;
}

/**
 * Health check paths to skip from logging
 */
const HEALTH_CHECK_PATHS = ['/api/health', '/health', '/_next/image', '/_next/static', '/favicon.ico'];

/**
 * RequestLogger provides request lifecycle logging
 * Useful for monitoring API performance and debugging
 */
export class RequestLogger {
  /**
   * Check if a path should be logged
   */
  static shouldLog(path: string): boolean {
    return !HEALTH_CHECK_PATHS.some(healthPath => path.startsWith(healthPath));
  }

  /**
   * Generate or extract request ID for correlation
   */
  static getRequestId(request?: NextRequest): string {
    if (request?.headers.get('x-request-id')) {
      return request.headers.get('x-request-id')!;
    }
    return randomUUID();
  }

  /**
   * Log incoming HTTP request
   */
  static logRequest(request: NextRequest, userId?: string, tenantId?: string): string {
    const requestId = this.getRequestId(request);
    const path = request.nextUrl.pathname + (request.nextUrl.search || '');
    const method = request.method;

    if (!this.shouldLog(path)) {
      return requestId;
    }

    const context: RequestLogContext = {
      method,
      path,
      requestId,
      ...(userId && { userId }),
      ...(tenantId && { tenantId }),
    };

    StructuredLogger.info(`HTTP ${method} ${path}`, context);

    return requestId;
  }

  /**
   * Log request completion with status and duration
   */
  static logResponse(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    tenantId?: string
  ): void {
    if (!this.shouldLog(path)) {
      return;
    }

    const context: RequestLogContext = {
      method,
      path,
      statusCode,
      duration,
      requestId,
      ...(userId && { userId }),
      ...(tenantId && { tenantId }),
    };

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `HTTP ${method} ${path} ${statusCode} (${duration}ms)`;

    if (level === 'error') {
      StructuredLogger.error(message, context);
    } else if (level === 'warn') {
      StructuredLogger.warn(message, context);
    } else {
      StructuredLogger.info(message, context);
    }
  }

  /**
   * Add X-Request-ID header to response
   */
  static addRequestIdHeader(response: NextResponse | Response, requestId: string): void {
    if (response instanceof NextResponse || response instanceof Response) {
      response.headers.set('X-Request-ID', requestId);
    }
  }

  /**
   * Extract user context from request (based on auth headers or cookies)
   * This is a helper that should be integrated with your auth system
   */
  static extractUserContext(_request: NextRequest): { userId?: string; tenantId?: string } {
    // This is a placeholder - integrate with your actual auth system
    // For now, we'll just return empty objects
    return {
      userId: undefined,
      tenantId: undefined,
    };
  }
}
