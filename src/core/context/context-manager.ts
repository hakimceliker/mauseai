/**
 * Context Manager - Manages execution context with budgets and redaction
 */
import * as Domain from '@/src/types/domain';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';
import { ContextRedactor } from './context-redactor';

export type ExecutionContextId = string & { readonly __brand: 'ExecutionContextId' };
export type TraceId = string & { readonly __brand: 'TraceId' };

export interface ExecutionContext {
  id: ExecutionContextId;
  task_id: Domain.TaskId;
  trace_id: TraceId;
  tenant_id: Domain.TenantId;
  user_id: string;
  context: Record<string, unknown>;
  current_size_bytes: number;
  max_size_bytes: number;
  compression_applied: boolean;
  redaction_applied: boolean;
  created_at: Date;
  last_updated: Date;
  entry_count: number;
}

export interface ContextAddResult {
  success: boolean;
  new_size_bytes: number;
  exceeded_budget: boolean;
  previous_size: number;
  message?: string;
}

export interface ContextBudgetConfig {
  max_size_bytes: number;
  max_entries: number;
  enable_compression: boolean;
  enable_redaction: boolean;
  warn_at_percent: number;
}

export class ContextManager {
  private static readonly DEFAULT_CONFIG: ContextBudgetConfig = {
    max_size_bytes: 16777216,
    max_entries: 10000,
    enable_compression: true,
    enable_redaction: true,
    warn_at_percent: 70,
  };

  static createContext(
    taskId: Domain.TaskId,
    traceId: TraceId,
    tenantId: Domain.TenantId,
    userId: string,
    config?: Partial<ContextBudgetConfig>
  ): ExecutionContext {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const contextId: ExecutionContextId = `ctx_${Date.now()}_${Math.random().toString(36).substring(7)}` as ExecutionContextId;

    StructuredLogger.debug('Created execution context', {
      contextId,
      taskId,
      traceId,
      maxSize: finalConfig.max_size_bytes,
    });

    return {
      id: contextId,
      task_id: taskId,
      trace_id: traceId,
      tenant_id: tenantId,
      user_id: userId,
      context: {},
      current_size_bytes: 0,
      max_size_bytes: finalConfig.max_size_bytes,
      compression_applied: false,
      redaction_applied: false,
      created_at: new Date(),
      last_updated: new Date(),
      entry_count: 0,
    };
  }

  static addToContext(
    execContext: ExecutionContext,
    key: string,
    value: unknown,
    config?: Partial<ContextBudgetConfig>
  ): ContextAddResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const newEntryJson = JSON.stringify({ [key]: value });
    const newEntrySize = Buffer.byteLength(newEntryJson);
    const previousSize = execContext.current_size_bytes;
    const newTotalSize = previousSize + newEntrySize;

    if (newTotalSize > execContext.max_size_bytes) {
      StructuredLogger.warn('Context budget exceeded', {
        taskId: execContext.task_id,
        previousSize,
        newSize: newTotalSize,
        maxSize: execContext.max_size_bytes,
      });
      return {
        success: false,
        new_size_bytes: previousSize,
        exceeded_budget: true,
        previous_size: previousSize,
        message: `Adding entry would exceed budget (${newTotalSize} > ${execContext.max_size_bytes})`,
      };
    }

    if (execContext.entry_count >= finalConfig.max_entries) {
      StructuredLogger.warn('Context entry limit exceeded', {
        taskId: execContext.task_id,
        entries: execContext.entry_count,
        maxEntries: finalConfig.max_entries,
      });
      return {
        success: false,
        new_size_bytes: previousSize,
        exceeded_budget: true,
        previous_size: previousSize,
        message: `Entry count limit reached (${execContext.entry_count} >= ${finalConfig.max_entries})`,
      };
    }

    execContext.context[key] = value;
    execContext.current_size_bytes = newTotalSize;
    execContext.entry_count++;
    execContext.last_updated = new Date();

    const budgetPercent = (newTotalSize / execContext.max_size_bytes) * 100;
    if (budgetPercent >= finalConfig.warn_at_percent && budgetPercent < 100) {
      StructuredLogger.warn('Context budget warning', {
        taskId: execContext.task_id,
        usagePercent: budgetPercent.toFixed(2),
      });
    }

    return {
      success: true,
      new_size_bytes: newTotalSize,
      exceeded_budget: false,
      previous_size: previousSize,
    };
  }

  static getContextSize(execContext: ExecutionContext): number {
    return execContext.current_size_bytes;
  }

  static getContextUsagePercent(execContext: ExecutionContext): number {
    return (execContext.current_size_bytes / execContext.max_size_bytes) * 100;
  }

  static enforceContextBudget(
    execContext: ExecutionContext,
    config?: Partial<ContextBudgetConfig>
  ): { allowed: boolean; reason?: string } {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    if (execContext.current_size_bytes > execContext.max_size_bytes) {
      StructuredLogger.error('Context budget violated', {
        taskId: execContext.task_id,
        currentSize: execContext.current_size_bytes,
        maxSize: execContext.max_size_bytes,
      });
      return { allowed: false, reason: 'Context size exceeds maximum allowed' };
    }

    if (execContext.entry_count > finalConfig.max_entries) {
      StructuredLogger.error('Context entry limit violated', {
        taskId: execContext.task_id,
        entries: execContext.entry_count,
        maxEntries: finalConfig.max_entries,
      });
      return { allowed: false, reason: 'Context entry count exceeds maximum allowed' };
    }

    return { allowed: true };
  }

  static applyRedaction(execContext: ExecutionContext): ExecutionContext {
    if (execContext.redaction_applied) return execContext;

    const redactionResult = ContextRedactor.redact(execContext.context);

    const redactedContext = {
      ...execContext,
      context: redactionResult.redacted,
      redaction_applied: true,
    };

    StructuredLogger.debug('Applied redaction to context', {
      taskId: execContext.task_id,
      sensitiveFieldsRemoved: redactionResult.sensitive_fields.length,
    });

    return redactedContext;
  }

  static getBudgetInfo(execContext: ExecutionContext): any {
    const usedBytes = execContext.current_size_bytes;
    const maxBytes = execContext.max_size_bytes;
    const remainingBytes = Math.max(0, maxBytes - usedBytes);
    const usagePercent = (usedBytes / maxBytes) * 100;

    return {
      used_bytes: usedBytes,
      max_bytes: maxBytes,
      remaining_bytes: remainingBytes,
      usage_percent: usagePercent,
      entry_count: execContext.entry_count,
    };
  }

  static compressContext(execContext: ExecutionContext, targetPercent: number = 50): ExecutionContext {
    const targetSize = (execContext.max_size_bytes * targetPercent) / 100;
    const originalSize = execContext.current_size_bytes;
    const keys = Object.keys(execContext.context);
    let currentSize = originalSize;
    let removed = 0;

    for (const key of keys) {
      if (currentSize <= targetSize) break;
      const entrySize = Buffer.byteLength(JSON.stringify({ [key]: execContext.context[key] }));
      delete execContext.context[key];
      currentSize -= entrySize;
      removed++;
    }

    execContext.current_size_bytes = currentSize;
    execContext.entry_count = keys.length - removed;
    execContext.compression_applied = true;
    execContext.last_updated = new Date();

    StructuredLogger.info('Compressed context', {
      taskId: execContext.task_id,
      originalSize,
      newSize: currentSize,
      entriesRemoved: removed,
    });

    return execContext;
  }

  static clearContext(execContext: ExecutionContext): ExecutionContext {
    const originalSize = execContext.current_size_bytes;
    execContext.context = {};
    execContext.current_size_bytes = 0;
    execContext.entry_count = 0;
    execContext.last_updated = new Date();

    StructuredLogger.debug('Cleared context', {
      taskId: execContext.task_id,
      freedBytes: originalSize,
    });

    return execContext;
  }

  static getMetadata(execContext: ExecutionContext): any {
    const now = new Date();
    const ageMsMs = now.getTime() - execContext.created_at.getTime();

    return {
      id: execContext.id,
      task_id: execContext.task_id,
      trace_id: execContext.trace_id,
      created_at: execContext.created_at,
      age_ms: ageMsMs,
      size_bytes: execContext.current_size_bytes,
      entry_count: execContext.entry_count,
      compressed: execContext.compression_applied,
      redacted: execContext.redaction_applied,
    };
  }

  static isHealthy(execContext: ExecutionContext, config?: Partial<ContextBudgetConfig>): boolean {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    return (
      execContext.current_size_bytes <= execContext.max_size_bytes &&
      execContext.entry_count <= finalConfig.max_entries
    );
  }
}
