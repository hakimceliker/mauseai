import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';
import { RequestLogger } from '@/src/lib/logging/request-logger';
import { AuditLogger } from '@/src/lib/logging/audit-logger';
import { ErrorLogger } from '@/src/lib/logging/error-logger';

// Mock console methods
let consoleLogOutput: string[] = [];
let consoleErrorOutput: string[] = [];

beforeEach(() => {
  consoleLogOutput = [];
  consoleErrorOutput = [];
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    // Capture the first argument (the JSON string)
    consoleLogOutput.push(args[0]);
  });
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    // Capture the first argument (the JSON string)
    consoleErrorOutput.push(args[0]);
  });
  // Reset log level to INFO
  StructuredLogger.setLogLevel('INFO');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StructuredLogger', () => {
  it('should log info messages in JSON format', () => {
    StructuredLogger.info('Test message', { userId: 'user-123', tenantId: 'tenant-456' });

    expect(consoleLogOutput.length).toBeGreaterThan(0);
    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('INFO');
    expect(output.message).toBe('Test message');
  });

  it('should sanitize sensitive data from messages', () => {
    StructuredLogger.info('Email test@example.com and token abc123def456ghi789jkl', {});

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toContain('[EMAIL]');
    expect(output.message).toContain('[REDACTED]');
  });

  it('should sanitize sensitive data from context', () => {
    StructuredLogger.info('Test message', {
      userId: 'user-123',
      password: 'secret-password',
      apiKey: 'super-secret-key-abc123def456ghi789',
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.password).toBeUndefined();
    expect(output.context.apiKey).toBeUndefined();
    expect(output.context.userId).toBe('user-12...');
  });

  it('should hash IDs for correlation without exposing full values', () => {
    StructuredLogger.info('Test', { userId: 'user-123-456-789' });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.userId).toBe('user-123...');
    expect(output.context.userId).not.toBe('user-123-456-789');
  });

  it('should respect log level configuration', () => {
    StructuredLogger.setLogLevel('WARN');
    StructuredLogger.debug('Debug message');
    StructuredLogger.info('Info message');
    StructuredLogger.warn('Warning message');

    // Only warn and error should be logged
    expect(consoleLogOutput.length).toBe(1);
    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toBe('Warning message');
  });

  it('should log error messages with error details', () => {
    const error = new Error('Test error message');
    StructuredLogger.error('An error occurred', { userId: 'user-123' }, error);

    expect(consoleErrorOutput.length).toBeGreaterThan(0);
    const output = JSON.parse(consoleErrorOutput[0]);
    expect(output.level).toBe('ERROR');
    expect(output.error).toBeDefined();
    expect(output.error.type).toBe('Error');
  });

  it('should include timestamp in all log entries', () => {
    StructuredLogger.info('Test message');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.timestamp).toBeDefined();
    expect(new Date(output.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('should support text format logging', () => {
    process.env.LOG_FORMAT = 'text';
    StructuredLogger.info('Test message', { userId: 'user-123' });

    const output = consoleLogOutput[0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('Test message');
    delete process.env.LOG_FORMAT;
  });

  it('should handle different log levels', () => {
    StructuredLogger.debug('Debug');
    StructuredLogger.info('Info');
    StructuredLogger.warn('Warn');
    StructuredLogger.error('Error', {});

    expect(consoleLogOutput.length).toBeGreaterThan(0);
  });

  it('should not include undefined context fields', () => {
    StructuredLogger.info('Test message', {
      userId: 'user-123',
      undefined_field: undefined,
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.userId).toBeDefined();
  });
});

describe('RequestLogger', () => {
  it('should generate unique request IDs', () => {
    const id1 = RequestLogger.getRequestId();
    const id2 = RequestLogger.getRequestId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should skip logging health check paths', () => {
    const healthPaths = ['/api/health', '/health', '/_next/static/test.js', '/favicon.ico'];

    healthPaths.forEach(path => {
      expect(RequestLogger.shouldLog(path)).toBe(false);
    });
  });

  it('should log regular API paths', () => {
    expect(RequestLogger.shouldLog('/api/tasks')).toBe(true);
    expect(RequestLogger.shouldLog('/api/conversations')).toBe(true);
  });

  it('should log response with status and duration', () => {
    const requestId = 'test-request-id';
    RequestLogger.logResponse(requestId, 'GET', '/api/tasks', 200, 123, 'user-123', 'tenant-456');

    expect(consoleLogOutput.length).toBeGreaterThan(0);
    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.statusCode).toBe(200);
    expect(output.context.duration).toBe(123);
    expect(output.context.requestId).toBe(requestId);
  });

  it('should log 4xx responses as warnings', () => {
    RequestLogger.logResponse('id', 'GET', '/api/tasks', 404, 50, 'user-123', 'tenant-456');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
  });

  it('should log 5xx responses as errors', () => {
    RequestLogger.logResponse('id', 'GET', '/api/tasks', 500, 50, 'user-123', 'tenant-456');

    const output = JSON.parse(consoleErrorOutput[0]);
    expect(output.level).toBe('ERROR');
  });
});

describe('AuditLogger', () => {
  it('should log task creation', () => {
    AuditLogger.logTaskCreated('user-123', 'tenant-456', 'task-789', 'workflow-111');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toContain('task_created');
    expect(output.context.action).toBe('task_created');
    expect(output.context.resource).toBe('task');
  });

  it('should log task completion', () => {
    AuditLogger.logTaskCompleted('user-123', 'tenant-456', 'task-789', 10.5);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toContain('task_completed');
    expect(output.context.details.cost).toBe(10.5);
  });

  it('should log task failure as error', () => {
    AuditLogger.logTaskFailed('user-123', 'tenant-456', 'task-789', 'Timeout');

    const output = JSON.parse(consoleErrorOutput[0]);
    expect(output.level).toBe('ERROR');
    expect(output.context.result).toBe('failure');
  });

  it('should log authentication attempts', () => {
    AuditLogger.logAuthAttempt('user-123', 'tenant-456', true);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.action).toBe('auth_attempt');
    expect(output.context.result).toBe('success');
  });

  it('should log failed authentication as warning', () => {
    AuditLogger.logAuthAttempt('user-123', 'tenant-456', false);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
    expect(output.context.result).toBe('failure');
  });

  it('should log permission checks', () => {
    AuditLogger.logPermissionCheck('user-123', 'tenant-456', 'task', 'task-789', true);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.action).toBe('permission_check');
    expect(output.context.result).toBe('success');
  });

  it('should log denied permissions as warnings', () => {
    AuditLogger.logPermissionCheck('user-123', 'tenant-456', 'task', 'task-789', false);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
  });

  it('should log rate limit triggers', () => {
    AuditLogger.logRateLimitTriggered('user-123', 'tenant-456', '/api/tasks', 100, '1h');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.action).toBe('rate_limit_triggered');
  });

  it('should log database operations', () => {
    AuditLogger.logDatabaseOperation('user-123', 'tenant-456', 'create', 'tasks', 'task-789', true);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.action).toBe('db_create');
    expect(output.context.resource).toBe('tasks');
  });

  it('should log sensitive access', () => {
    AuditLogger.logSensitiveAccess('user-123', 'tenant-456', 'user', 'user-999', true);

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.action).toBe('sensitive_access');
  });

  it('should sanitize user IDs in audit logs', () => {
    AuditLogger.logTaskCreated('user-123456789', 'tenant-987654321', 'task-789', 'workflow-111');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.userId).toBe('user-123...');
    expect(output.context.tenantId).toBe('tenant-9...');
  });
});

describe('ErrorLogger', () => {
  it('should generate unique error IDs', () => {
    const id1 = ErrorLogger.generateErrorId();
    const id2 = ErrorLogger.generateErrorId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f-]+$/i);
  });

  it('should log errors with context', () => {
    const errorId = ErrorLogger.generateErrorId();
    ErrorLogger.logError(new Error('Test error'), {
      errorId,
      requestPath: '/api/test',
      method: 'POST',
    });

    expect(consoleErrorOutput.length).toBeGreaterThan(0);
    const output = JSON.parse(consoleErrorOutput[0]);
    expect(output.level).toBe('ERROR');
  });

  it('should log validation errors as warnings', () => {
    const errorId = ErrorLogger.generateErrorId();
    ErrorLogger.logValidationError('Invalid input', {
      errorId,
      requestPath: '/api/test',
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
  });

  it('should log authentication errors as warnings', () => {
    const errorId = ErrorLogger.generateErrorId();
    ErrorLogger.logAuthError('Invalid credentials', {
      errorId,
      requestPath: '/api/auth',
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
  });

  it('should log permission denied errors as warnings', () => {
    const errorId = ErrorLogger.generateErrorId();
    ErrorLogger.logPermissionDenied('User lacks permission', {
      errorId,
      requestPath: '/api/tasks/123',
      userId: 'user-123',
      tenantId: 'tenant-456',
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBe('WARN');
  });

  it('should include error context without sensitive data', () => {
    const errorId = ErrorLogger.generateErrorId();
    ErrorLogger.logError(new Error('Test error'), {
      errorId,
      requestPath: '/api/test',
      userId: 'user-123',
      tenantId: 'tenant-456',
      method: 'POST',
    });

    expect(consoleErrorOutput.length).toBeGreaterThan(0);
    const output = JSON.parse(consoleErrorOutput[0]);
    expect(output.context.userId).toBe('user-12...');
    expect(output.context.tenantId).toBe('tenant-...');
  });
});

describe('Sensitive Data Filtering', () => {
  it('should not log passwords', () => {
    StructuredLogger.info('Test', { password: 'secret123', secret: 'hidden' });

    const output = JSON.parse(consoleLogOutput[0]);
    // When all context fields are filtered, context becomes undefined
    expect(output.context).toBeUndefined();
  });

  it('should not log API keys', () => {
    StructuredLogger.info('Test', { api_key: 'sk-1234567890', apiKey: 'sk-0987654321' });

    const output = JSON.parse(consoleLogOutput[0]);
    // When all context fields are filtered, context becomes undefined
    expect(output.context).toBeUndefined();
  });

  it('should not log tokens', () => {
    StructuredLogger.info('Test', { token: 'Bearer abc123def456', authorization: 'Bearer xyz789' });

    const output = JSON.parse(consoleLogOutput[0]);
    // When all context fields are filtered, context becomes undefined
    expect(output.context).toBeUndefined();
  });

  it('should not log email addresses in messages', () => {
    StructuredLogger.info('User logged in from user@example.com', {});

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toContain('[EMAIL]');
    expect(output.message).not.toContain('@example.com');
  });

  it('should not log credit card numbers', () => {
    StructuredLogger.info('Payment from 4111-1111-1111-1111', {});

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.message).toContain('[CARD]');
  });
});

describe('Log Format Configuration', () => {
  it('should support JSON format (default)', () => {
    StructuredLogger.info('Test message');

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.level).toBeDefined();
    expect(output.timestamp).toBeDefined();
    expect(output.message).toBeDefined();
  });

  it('should support text format', () => {
    process.env.LOG_FORMAT = 'text';
    StructuredLogger.info('Test message', { userId: 'user-123' });

    const output = consoleLogOutput[0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('Test message');

    delete process.env.LOG_FORMAT;
  });
});

describe('Correlation IDs', () => {
  it('should include request IDs in audit logs', () => {
    AuditLogger.log({
      action: 'test_action',
      resource: 'test_resource',
      resourceId: 'test-id',
      result: 'success',
      userId: 'user-123',
      tenantId: 'tenant-456',
      requestId: 'correlation-id-123',
    });

    const output = JSON.parse(consoleLogOutput[0]);
    expect(output.context.requestId).toBe('correlation-id-123');
  });
});
