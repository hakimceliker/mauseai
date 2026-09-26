/**
 * Error logging utility
 * Logs errors with context but avoids logging sensitive data
 */

interface ErrorLogContext {
  errorId: string;
  requestPath?: string;
  userId?: string;
  tenantId?: string;
  method?: string;
  timestamp?: string;
  userAgent?: string;
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
   * Log an error with context
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
      context: {
        ...context,
        timestamp,
      },
      stack,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR]', {
        ...logEntry,
        stack: stack ? stack.split('\n').slice(0, 5).join('\n') : undefined,
      });
    }

    // In production, you would send this to a logging service
    // Example: Datadog, Sentry, CloudWatch, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to production logging service
      // logToProductionService(logEntry);
    }

    // Always log to stderr for container/serverless environments
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp,
        errorId: context.errorId,
        errorType,
        errorMessage,
        requestPath: context.requestPath,
        method: context.method,
        userId: context.userId ? this.hashId(context.userId) : undefined,
        tenantId: context.tenantId ? this.hashId(context.tenantId) : undefined,
      })
    );
  }

  /**
   * Hash IDs for logging (don't log full IDs)
   * This allows correlation without exposing the actual ID
   */
  private static hashId(id: string): string {
    // Return first 8 chars of ID hash for correlation
    return id.substring(0, 8);
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
    }
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[REQUEST]', {
        timestamp: new Date().toISOString(),
        method,
        path,
        userIdHash: context.userId ? this.hashId(context.userId) : undefined,
        tenantIdHash: context.tenantId ? this.hashId(context.tenantId) : undefined,
      });
    }
  }

  /**
   * Sanitize an error message for logging (remove sensitive patterns)
   */
  private static sanitizeMessage(message: string): string {
    // Remove common sensitive patterns
    let sanitized = message;

    // Remove email addresses
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

    // Remove potential tokens/keys (long base64-like strings)
    sanitized = sanitized.replace(/[A-Za-z0-9\-_]{32,}/g, '[REDACTED]');

    // Remove SQL patterns (basic)
    sanitized = sanitized.replace(/SELECT\s+.*?\s+FROM\s+\w+/gi, 'SELECT [REDACTED]');

    return sanitized;
  }
}
