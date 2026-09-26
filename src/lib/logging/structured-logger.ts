/**
 * Structured JSON logging utility
 * Provides production-ready logging with correlation IDs and context
 * No sensitive data (passwords, tokens, full IDs) is logged
 */

import { redactText } from '../security/redact';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
}

/**
 * StructuredLogger provides production-ready logging
 * Outputs structured JSON for easy parsing by log aggregation services
 */
export class StructuredLogger {
  private static readonly LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  private static currentLogLevel: LogLevel = this.getLogLevel();

  /**
   * Get log level from environment or default to INFO
   */
  private static getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel === 'DEBUG' || envLevel === 'INFO' || envLevel === 'WARN' || envLevel === 'ERROR') {
      return envLevel;
    }
    return 'INFO';
  }

  /**
   * Set log level at runtime
   */
  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Check if a log level should be logged based on current configuration
   */
  private static shouldLog(level: LogLevel): boolean {
    return this.LOG_LEVEL_PRIORITY[level] >= this.LOG_LEVEL_PRIORITY[this.currentLogLevel];
  }

  /**
   * Log debug message
   */
  static debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log info message
   */
  static info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  /**
   * Log warning message
   */
  static warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  /**
   * Log error message
   */
  static error(message: string, context?: LogContext, error?: Error): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: this.sanitizeMessage(message),
      context: this.sanitizeContext(context),
    };

    if (error) {
      entry.error = {
        type: error.constructor.name,
        message: this.sanitizeMessage(error.message),
        stack: error.stack ? redactText(error.stack) : undefined,
      };
    }

    this.output(entry);
  }

  /**
   * Main logging method
   */
  private static log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.sanitizeMessage(message),
      context: this.sanitizeContext(context),
    };

    this.output(entry);
  }

  /**
   * Output log entry to console
   */
  private static output(entry: StructuredLogEntry): void {
    const logFormat = process.env.LOG_FORMAT || 'json';
    const isError = entry.level === 'ERROR';

    if (logFormat === 'text') {
      // Human-readable format
      const contextStr = entry.context ? ` [${this.formatContext(entry.context)}]` : '';
      const errorStr = entry.error ? ` ${entry.error.type}: ${entry.error.message}` : '';
      const message = `[${entry.level}] ${entry.timestamp} ${entry.message}${contextStr}${errorStr}`;
      if (isError) {
        console.error(message);
      } else {
        console.log(message);
      }
    } else {
      // JSON format (default)
      const output = {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        ...(entry.context && { context: entry.context }),
        ...(entry.error && { error: entry.error }),
      };
      const jsonOutput = JSON.stringify(output);
      if (isError) {
        console.error(jsonOutput);
      } else {
        console.log(jsonOutput);
      }
    }
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private static sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized: LogContext = {};
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'api_key',
      'apikey', // normalized from apiKey
      'authorization',
      'authtoken',
      'auth_token',
      'accesstoken',
      'access_token',
      'refreshtoken',
      'refresh_token',
      'privatekey',
      'private_key',
      'secretkey',
      'secret_key',
    ];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();

      // Skip sensitive keys
      if (sensitiveKeys.includes(lowerKey)) {
        continue;
      }

      // Hash only user and tenant IDs for correlation without exposing full values
      // Don't hash other IDs like requestId, correlationId, etc. as those are meant to be tracked
      if ((key === 'userId' || key === 'tenantId') && typeof value === 'string') {
        sanitized[key] = this.hashId(value);
      } else {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Sanitize message to remove sensitive patterns
   */
  private static sanitizeMessage(message: string): string {
    if (typeof message !== 'string') {
      return String(message);
    }

    // Known secret env values and credential shapes first, then PII.
    let sanitized = redactText(message);

    // Remove email addresses
    sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

    // Remove tokens and keys (Bearer, sk-, etc prefixed or 20+ char alphanumeric)
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9._-]+/g, '[REDACTED]');
    sanitized = sanitized.replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]');
    sanitized = sanitized.replace(/[A-Za-z0-9]{20,}/g, '[REDACTED]');

    // Remove credit card patterns
    sanitized = sanitized.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[CARD]');

    // Remove IP addresses (optional, uncomment if needed)
    // sanitized = sanitized.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

    return sanitized;
  }

  /**
   * Hash IDs for logging (don't log full IDs)
   * Shows enough for correlation while protecting privacy
   */
  private static hashId(id: string): string {
    // For short-medium IDs (≤ 11 chars): show 7 chars
    // For longer IDs (> 11 chars): show 8 chars
    // This balances readability with privacy protection
    const charsToShow = id.length <= 11 ? 7 : 8;
    const masked = id.substring(0, charsToShow);
    return `${masked}...`;
  }

  /**
   * Format context for text output
   */
  private static formatContext(context: LogContext): string {
    return Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
  }
}
