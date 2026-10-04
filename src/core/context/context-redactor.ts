/**
 * Context Redactor - Removes secrets and sensitive data from context
 */
import { StructuredLogger } from '@/src/lib/logging/structured-logger';

export interface RedactionStats {
  original_size_bytes: number;
  redacted_size_bytes: number;
  patterns_found: Record<string, number>;
  redaction_ratio: number;
}

export interface RedactionResult {
  redacted: Record<string, unknown>;
  stats: RedactionStats;
  sensitive_fields: string[];
}

export class ContextRedactor {
  private static readonly SENSITIVE_PATTERNS = [
    /api[_\-]?key/i, /secret/i, /password/i, /token/i, /credential/i,
    /bearer/i, /auth[_\-]?(token|secret|key)/i, /api[_\-]?(secret|token|key)/i,
    /private[_\-]?key/i, /access[_\-]?token/i, /refresh[_\-]?token/i,
    /session[_\-]?token/i, /oauth[_\-]?token/i, /apikey/i, /api_secret/i,
  ];

  private static readonly SAFE_PATTERNS = [
    /model/i, /provider/i, /version/i, /name/i, /description/i,
    /type/i, /id/i, /count/i, /timestamp/i, /date/i, /time/i, /status/i, /message/i,
  ];

  static isSensitiveField(fieldName: string): boolean {
    if (this.SAFE_PATTERNS.some(p => p.test(fieldName))) return false;
    return this.SENSITIVE_PATTERNS.some(p => p.test(fieldName));
  }

  static redactValue(value: unknown, fieldName?: string): { redacted: unknown; isSensitive: boolean } {
    if (fieldName && this.isSensitiveField(fieldName)) {
      return { redacted: '[REDACTED]', isSensitive: true };
    }
    if (typeof value === 'string' && value.length > 20 &&
        (value.match(/^[a-zA-Z0-9_\-\.]+$/) || value.startsWith('Bearer ') || value.includes('sk_'))) {
      return { redacted: '[REDACTED]', isSensitive: true };
    }
    return { redacted: value, isSensitive: false };
  }

  static redact(context: Record<string, unknown>): RedactionResult {
    const originalJson = JSON.stringify(context);
    const originalSize = Buffer.byteLength(originalJson);
    const redacted: Record<string, unknown> = {};
    const sensitiveFields: string[] = [];
    const patternsFound: Record<string, number> = {};

    const processValue = (value: unknown, key: string, depth = 0): unknown => {
      if (depth > 10 || value === null || value === undefined) return value;
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          result[k] = processValue(v, k, depth + 1);
        }
        return result;
      }
      if (Array.isArray(value)) {
        return value.map((item, i) => processValue(item, `[${i}]`, depth + 1));
      }
      const { redacted: rv, isSensitive } = this.redactValue(value, key);
      if (isSensitive) {
        sensitiveFields.push(key);
        for (const p of this.SENSITIVE_PATTERNS) {
          if (p.test(key)) patternsFound[p.source] = (patternsFound[p.source] || 0) + 1;
        }
      }
      return rv;
    };

    for (const [key, value] of Object.entries(context)) {
      redacted[key] = processValue(value, key);
    }

    const redactedSize = Buffer.byteLength(JSON.stringify(redacted));
    return {
      redacted,
      stats: {
        original_size_bytes: originalSize,
        redacted_size_bytes: redactedSize,
        patterns_found: patternsFound,
        redaction_ratio: sensitiveFields.length > 0 ? sensitiveFields.length / Object.keys(context).length : 0,
      },
      sensitive_fields: sensitiveFields,
    };
  }

  static hasSensitiveData(context: Record<string, unknown>): boolean {
    return this.redact(context).sensitive_fields.length > 0;
  }

  static getSensitiveFields(context: Record<string, unknown>): string[] {
    return this.redact(context).sensitive_fields;
  }

  static createSafeLoggingCopy(context: Record<string, unknown>): Record<string, unknown> {
    return this.redact(context).redacted;
  }

  static verifyNoSecrets(redactedContext: Record<string, unknown>): boolean {
    const json = JSON.stringify(redactedContext).toLowerCase();
    const patterns = [
      /sk_[a-z0-9]{20,}/, /pk_[a-z0-9]{20,}/, /bearer\s+[a-z0-9_\-\.]+/i,
      /authorization:\s*[a-z0-9_\-\.]+/i, /api[_\-]?key\s*[:=]\s*[a-z0-9_\-\.]+/i,
    ];
    for (const p of patterns) {
      if (p.test(json) && !json.includes('[redacted]')) {
        StructuredLogger.warn('Potential secret found', { pattern: p.source });
        return false;
      }
    }
    return true;
  }

  static redactFieldNames(context: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        result[`[REDACTED_${key}]`] = '[REDACTED]';
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
