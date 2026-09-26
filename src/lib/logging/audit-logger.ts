/**
 * Audit logging for compliance and user action tracking
 * Logs all significant user actions with timestamp, user, action, resource, and result
 */

import { StructuredLogger, type LogContext } from './structured-logger';

export interface AuditLogEntry extends LogContext {
  action: string;
  resource: string;
  resourceId: string;
  result: 'success' | 'failure';
  userId: string;
  tenantId: string;
  details?: Record<string, unknown>;
  error?: string;
}

/**
 * AuditLogger provides structured audit logging for compliance
 * Every significant user action should be logged here
 */
export class AuditLogger {
  /**
   * Log an audit event to structured logger
   */
  static log(entry: AuditLogEntry): void {
    const { action, resource, resourceId, result, userId, tenantId, details, error, requestId } = entry;

    const message = `AUDIT: User ${userId} performed ${action} on ${resource} ${resourceId} - ${result}`;

    const context: LogContext = {
      action,
      resource,
      resourceId,
      result,
      userId, // Let the structured logger handle hashing
      tenantId, // Let the structured logger handle hashing
      ...(requestId && { requestId }),
      ...(details && { details }),
      ...(error && { error }),
    };

    // Determine log level based on action and result
    if (result === 'failure') {
      // Some failures are warnings (expected failures), others are errors (unexpected failures)
      const warningActions = [
        'auth_attempt',
        'permission_check',
        'rate_limit_triggered',
      ];

      if (warningActions.includes(action)) {
        StructuredLogger.warn(message, context);
      } else {
        StructuredLogger.error(message, context);
      }
    } else {
      StructuredLogger.info(message, context);
    }
  }

  /**
   * Log task creation
   */
  static logTaskCreated(
    userId: string,
    tenantId: string,
    taskId: string,
    workflowId: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'task_created',
      resource: 'task',
      resourceId: taskId,
      result: 'success',
      userId,
      tenantId,
      details: { workflow_id: workflowId, ...details },
    });
  }

  /**
   * Log task completion
   */
  static logTaskCompleted(
    userId: string,
    tenantId: string,
    taskId: string,
    cost: number,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'task_completed',
      resource: 'task',
      resourceId: taskId,
      result: 'success',
      userId,
      tenantId,
      details: { cost, ...details },
    });
  }

  /**
   * Log task failure
   */
  static logTaskFailed(
    userId: string,
    tenantId: string,
    taskId: string,
    error: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'task_failed',
      resource: 'task',
      resourceId: taskId,
      result: 'failure',
      userId,
      tenantId,
      error,
      details,
    });
  }

  /**
   * Log authentication attempt
   */
  static logAuthAttempt(
    userId: string,
    tenantId: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'auth_attempt',
      resource: 'authentication',
      resourceId: userId,
      result: success ? 'success' : 'failure',
      userId,
      tenantId,
      details,
    });
  }

  /**
   * Log permission check
   */
  static logPermissionCheck(
    userId: string,
    tenantId: string,
    resource: string,
    resourceId: string,
    granted: boolean,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'permission_check',
      resource,
      resourceId,
      result: granted ? 'success' : 'failure',
      userId,
      tenantId,
      details,
    });
  }

  /**
   * Log rate limit trigger
   */
  static logRateLimitTriggered(
    userId: string,
    tenantId: string,
    path: string,
    limit: number,
    window: string,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'rate_limit_triggered',
      resource: 'api',
      resourceId: path,
      result: 'failure',
      userId,
      tenantId,
      details: { limit, window, ...details },
    });
  }

  /**
   * Log database operation
   */
  static logDatabaseOperation(
    userId: string,
    tenantId: string,
    operation: 'create' | 'read' | 'update' | 'delete',
    table: string,
    recordId: string,
    success: boolean,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: `db_${operation}`,
      resource: table,
      resourceId: recordId,
      result: success ? 'success' : 'failure',
      userId,
      tenantId,
      details,
    });
  }

  /**
   * Log access to sensitive resource
   */
  static logSensitiveAccess(
    userId: string,
    tenantId: string,
    resource: string,
    resourceId: string,
    granted: boolean,
    details?: Record<string, unknown>
  ): void {
    this.log({
      action: 'sensitive_access',
      resource,
      resourceId,
      result: granted ? 'success' : 'failure',
      userId,
      tenantId,
      details,
    });
  }

}
