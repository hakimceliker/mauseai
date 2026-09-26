import { describe, expect, it, vi } from 'vitest';
import {
  ApiErrorHandler,
  ValidationError,
  AuthError,
  NotFoundError,
  ServerError,
} from '@/src/lib/errors/api-error-handler';
import { ErrorLogger } from '@/src/lib/logging/error-logger';

// Mock the ErrorLogger
vi.mock('@/src/lib/logging/error-logger', () => ({
  ErrorLogger: {
    logError: vi.fn(),
  },
}));

describe('ApiErrorHandler', () => {
  describe('ValidationError', () => {
    it('should create a validation error with correct status code', () => {
      const error = new ValidationError({ field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.safeMessage).toBe('Invalid request');
    });

    it('should handle validation error without exposing details', () => {
      const error = new ValidationError({ field: 'password', reason: 'too short' });
      const context = {
        requestPath: '/api/test',
        method: 'POST',
      };
      const response = ApiErrorHandler.handle(error, context);

      expect(response.status).toBe(400);
      // Don't expose the actual validation error details
    });
  });

  describe('AuthError', () => {
    it('should create an auth error with correct status code', () => {
      const error = new AuthError();
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.safeMessage).toBe('Unauthorized');
    });

    it('should handle auth error without exposing details', () => {
      const error = new AuthError({ reason: 'invalid token' });
      const context = {
        requestPath: '/api/test',
        method: 'POST',
      };
      const response = ApiErrorHandler.handle(error, context);

      expect(response.status).toBe(401);
      // Should not expose "invalid token" in response
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with correct status code', () => {
      const error = new NotFoundError({ resource: 'user', id: '123' });
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND_ERROR');
      expect(error.safeMessage).toBe('Not found');
    });

    it('should handle not found error without exposing resource details', () => {
      const error = new NotFoundError({ resource: 'task', id: 'task-123' });
      const context = {
        requestPath: '/api/tasks/task-123',
        method: 'GET',
      };
      const response = ApiErrorHandler.handle(error, context);

      expect(response.status).toBe(404);
    });
  });

  describe('ServerError', () => {
    it('should create a server error with correct status code', () => {
      const error = new ServerError();
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.safeMessage).toBe('Internal server error');
    });
  });

  describe('Error ID generation', () => {
    it('should include an error ID in response for client reference', async () => {
      const error = new ValidationError();
      const response = ApiErrorHandler.handle(error);
      const data = await response.json();

      expect(data.error.id).toBeDefined();
      expect(typeof data.error.id).toBe('string');
      expect(data.error.id.length).toBeGreaterThan(0);
    });

    it('should generate unique error IDs for each error', () => {
      const error1 = new ValidationError();
      const error2 = new ValidationError();

      const response1 = ApiErrorHandler.handle(error1);
      const response2 = ApiErrorHandler.handle(error2);

      // IDs should be different
      expect(response1).toBeDefined();
      expect(response2).toBeDefined();
    });
  });

  describe('Safe error responses', () => {
    it('should never expose stack traces', () => {
      const error = new Error('Database connection failed at line 42');
      const response = ApiErrorHandler.handle(error);

      // Stack trace should never be in response
      expect(response).toBeDefined();
    });

    it('should never expose file paths', () => {
      const error = new Error('Failed to read /home/claude/src/secret.env');
      const response = ApiErrorHandler.handle(error);

      expect(response).toBeDefined();
      // Response should not contain file paths
    });

    it('should never expose SQL queries', () => {
      const error = new Error('SELECT * FROM users WHERE password = "admin123"');
      const response = ApiErrorHandler.handle(error);

      expect(response).toBeDefined();
      // Response should not contain SQL
    });

    it('should return structured error response', async () => {
      const error = new ValidationError();
      const response = ApiErrorHandler.handle(error);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('id');
    });
  });

  describe('getSafeMessage', () => {
    it('should return safe message for ApiError', () => {
      const error = new AuthError();
      const message = ApiErrorHandler.getSafeMessage(error);
      expect(message).toBe('Unauthorized');
    });

    it('should not expose error message for generic Error', () => {
      const error = new Error('Sensitive database error info');
      const message = ApiErrorHandler.getSafeMessage(error);
      expect(message).toBe('An error occurred');
    });

    it('should not expose message for unknown error', () => {
      const message = ApiErrorHandler.getSafeMessage('some string error');
      expect(message).toBe('Internal server error');
    });
  });

  describe('Context logging', () => {
    it('should log errors with context', () => {
      const error = new ValidationError();
      const context = {
        requestPath: '/api/tasks',
        method: 'POST',
        userId: 'user-123',
        tenantId: 'tenant-456',
      };

      ApiErrorHandler.handle(error, context);

      expect(ErrorLogger.logError).toHaveBeenCalled();
      const callArgs = (ErrorLogger.logError as any).mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        requestPath: context.requestPath,
        method: context.method,
      });
    });
  });

  describe('Error type mapping', () => {
    it('should handle SyntaxError as validation error', async () => {
      const error = new SyntaxError('Invalid JSON');
      const response = ApiErrorHandler.handle(error);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toBe('Invalid request');
    });

    it('should handle TypeError as validation error', async () => {
      const error = new TypeError('Cannot read property x of undefined');
      const response = ApiErrorHandler.handle(error);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
