import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { ErrorLogger } from '@/src/lib/logging/error-logger';

/**
 * Custom error types for safe error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public safeMessage: string,
    public details?: unknown
  ) {
    super(safeMessage);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(details?: unknown) {
    super('VALIDATION_ERROR', 400, 'Invalid request', details);
    this.name = 'ValidationError';
  }
}

export class AuthError extends ApiError {
  constructor(details?: unknown) {
    super('AUTH_ERROR', 401, 'Unauthorized', details);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends ApiError {
  constructor(details?: unknown) {
    super('NOT_FOUND_ERROR', 404, 'Not found', details);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(details?: unknown) {
    super('FORBIDDEN_ERROR', 403, 'Forbidden', details);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(details?: unknown) {
    super('CONFLICT_ERROR', 409, 'Conflict', details);
    this.name = 'ConflictError';
  }
}

export class ServerError extends ApiError {
  constructor(details?: unknown) {
    super('SERVER_ERROR', 500, 'Internal server error', details);
    this.name = 'ServerError';
  }
}

/**
 * Safe error response interface
 */
export interface SafeErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    id: string;
  };
}

/**
 * Maps error types to safe HTTP responses
 * Prevents information disclosure by never exposing:
 * - Stack traces
 * - SQL queries
 * - File paths
 * - Internal implementation details
 */
export class ApiErrorHandler {
  /**
   * Handle an error and return a safe response
   */
  static handle(
    error: unknown,
    context?: {
      requestPath?: string;
      userId?: string;
      tenantId?: string;
      method?: string;
    }
  ): NextResponse<SafeErrorResponse> {
    const errorId = randomUUID();

    // Log the full error server-side
    ErrorLogger.logError(error, {
      errorId,
      ...context,
    });

    // Determine error type and safe message
    let statusCode = 500;
    let code = 'SERVER_ERROR';
    let safeMessage = 'Internal server error';

    if (error instanceof ValidationError) {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      safeMessage = 'Invalid request';
    } else if (error instanceof AuthError) {
      statusCode = 401;
      code = 'AUTH_ERROR';
      safeMessage = 'Unauthorized';
    } else if (error instanceof NotFoundError) {
      statusCode = 404;
      code = 'NOT_FOUND_ERROR';
      safeMessage = 'Not found';
    } else if (error instanceof ForbiddenError) {
      statusCode = 403;
      code = 'FORBIDDEN_ERROR';
      safeMessage = 'Forbidden';
    } else if (error instanceof ConflictError) {
      statusCode = 409;
      code = 'CONFLICT_ERROR';
      safeMessage = 'Conflict';
    } else if (error instanceof ApiError) {
      statusCode = error.statusCode;
      code = error.code;
      safeMessage = error.safeMessage;
    } else if (error instanceof SyntaxError) {
      // JSON parsing errors
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      safeMessage = 'Invalid request';
    } else if (error instanceof TypeError) {
      // Type errors are often from bad input
      statusCode = 400;
      code = 'VALIDATION_ERROR';
      safeMessage = 'Invalid request';
    }

    // Return safe error response
    const response: SafeErrorResponse = {
      success: false,
      error: {
        code,
        message: safeMessage,
        id: errorId,
      },
    };

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Safely extract an error message without exposing sensitive info
   */
  static getSafeMessage(error: unknown): string {
    if (error instanceof ApiError) {
      return error.safeMessage;
    }
    if (error instanceof Error) {
      // Don't expose the actual error message
      return 'An error occurred';
    }
    return 'Internal server error';
  }
}
