/**
 * Error logging utility
 * Logs errors with context using structured logger
 * Avoids logging sensitive data like passwords, tokens, full IDs
 */

import { StructuredLogger, type LogContext } from './structured-logger';
import { randomUUID } from 'crypto';
import { observability } from '@/src/lib/observability';

interface ErrorLogContext {
  errorId: string;
  requestPath?: string;
  userId?: string;
  tenantId?: string;
  method?: string;
  userAgent?: string;
  requestId?: string;
}

interface ErrorLogEntry {
  timestamp: string;
  errorId: string;
  errorType: string;
  errorMessage: string;
  statusCode?: number;
  context: ErrorLogContext;
  stack?: string;
}

export class ErrorLogger {
  /**
   * Log an error with context using structured logger
   * Avoids logging sensitive data like passwords, tokens, full IDs
   */
  static logError(error: unknown, context: ErrorLogContext): void {
    const timestamp = new Date().toISOString();
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    // Create sanitized log entry
    const logEntry: ErrorLogEntry = {
      timestamp,
      errorId: context.errorId,
      errorType,
      errorMessage,
      context,
      stack,
    };

    // Build context for structured logger
    const logContext: LogContext = {
      errorId: context.errorId,
      ...(context.requestPath && { requestPath: context.requestPath }),
      ...(context.method && { method: context.method }),
      ...(context.userId && { userId: context.userId }),
      ...(context.tenantId && { tenantId: context.tenantId }),
      ...(context.userAgent && { userAgent: context.userAgent }),
      ...(context.requestId && { requestId: context.requestId }),
      errorType,
    };

    // Log using structured logger
    StructuredLogger.error(
      `Error occurred: ${errorMessage}`,
      logContext,
      error instanceof Error ? error : new Error(errorMessage)
    );

    // Telemetry is best-effort and never blocks or fails the request.
    void observability.reportException(error, {
      errorId: context.errorId,
      requestPath: context.requestPath,
      method: context.method,
      errorType,
    }).catch(() => undefined);

    // Also log details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR_DETAILS]', {
        ...logEntry,
        stack: stack ? stack.split('\n').slice(0, 10).join('\n') : undefined,
      });
    }
  }

  /**
   * Log request information (without sensitive data)
   */
  static logRequest(
    method: string,
    path: string,
    context: {
      userId?: string;
      tenantId?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): void {
    const logContext: LogContext = {
      method,
      path,
      ...(context.userId && { userId: context.userId }),
      ...(context.tenantId && { tenantId: context.tenantId }),
      ...(context.requestId && { requestId: context.requestId }),
    };

    StructuredLogger.debug(`HTTP Request: ${method} ${path}`, logContext);
  }

  /**
   * Generate a unique error ID for correlation
   */
  static generateErrorId(): string {
    return randomUUID();
  }

  /**
   * Log a validation error
   */
  static logValidationError(
    message: string,
    context: ErrorLogContext,
    details?: Record<string, unknown>
  ): void {
    const logContext: LogContext = {
      errorId: context.errorId,
      ...(context.requestPath && { requestPath: context.requestPath }),
      ...(context.method && { method: context.method }),
      ...(context.userId && { userId: context.userId }),
      ...(context.tenantId && { tenantId: context.tenantId }),
      ...(details && { validationDetails: details }),
    };

    StructuredLogger.warn(`Validation error: ${message}`, logContext);
  }

  /**
   * Log an authentication error
   */
  static logAuthError(message: string, context: ErrorLogContext): void {
    const logContext: LogContext = {
      errorId: context.errorId,
      ...(context.requestPath && { requestPath: context.requestPath }),
      ...(context.method && { method: context.method }),
    };

    StructuredLogger.warn(`Authentication error: ${message}`, logContext);
  }

  /**
   * Log a permission denied error
   */
  static logPermissionDenied(message: string, context: ErrorLogContext, details?: Record<string, unknown>): void {
    const logContext: LogContext = {
      errorId: context.errorId,
      ...(context.requestPath && { requestPath: context.requestPath }),
      ...(context.method && { method: context.method }),
      ...(context.userId && { userId: context.userId }),
      ...(context.tenantId && { tenantId: context.tenantId }),
      ...(details && { details }),
    };

    StructuredLogger.warn(`Permission denied: ${message}`, logContext);
  }
}
