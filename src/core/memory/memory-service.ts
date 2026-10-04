/**
 * Memory Service - Tenant-aware retrieval with permission-aware context
 * Manages memory storage and retrieval across tenants with access control
 */

import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';
import { RetrievalPolicy, RetrievalScope } from './retrieval-policy';

export type MemoryKey = string & { readonly __brand: 'MemoryKey' };
export type MemoryId = string & { readonly __brand: 'MemoryId' };
export type TraceId = string & { readonly __brand: 'TraceId' };

export interface MemoryEntry {
  id: MemoryId;
  tenant_id: Domain.TenantId;
  key: MemoryKey;
  value: Record<string, unknown>;
  owner_id: string;
  scope: RetrievalScope;
  is_sensitive: boolean;
  created_at: Date;
  accessed_at: Date;
  ttl_ms?: number;
  trace_id: TraceId;
  version: number;
}

export interface MemoryRetrievalResult {
  found: boolean;
  value?: Record<string, unknown>;
  access_denied?: boolean;
  reason?: string;
  scope: RetrievalScope;
}

export interface ContextSummary {
  total_entries: number;
  total_bytes: number;
  sensitive_count: number;
  scopes: Record<RetrievalScope, number>;
  oldest_entry?: Date;
  newest_entry?: Date;
}

/**
 * MemoryService manages tenant-isolated memory with permission-aware retrieval
 */
export class MemoryService {
  /**
   * Store memory in the system with tenant isolation
   */
  static async storeMemory(
    tenantId: Domain.TenantId,
    key: MemoryKey,
    value: Record<string, unknown>,
    userId: string,
    scope: RetrievalScope = 'TENANT_ISOLATED',
    traceId: TraceId,
    isSensitive = false,
    ttlMs?: number
  ): Promise<MemoryId> {
    const db = getSupabaseAdmin();

    const memoryId: MemoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(7)}` as MemoryId;

    const { error } = await db.from('memory_entries').insert({
      id: memoryId,
      tenant_id: tenantId,
      key,
      value,
      owner_id: userId,
      scope,
      is_sensitive: isSensitive,
      trace_id: traceId,
      version: 1,
      ttl_ms: ttlMs,
      created_at: new Date().toISOString(),
      accessed_at: new Date().toISOString(),
    });

    if (error) {
      StructuredLogger.error('Failed to store memory', {
        tenantId,
        key,
        error: error.message,
      });
      throw new Error(`Failed to store memory: ${error.message}`);
    }

    StructuredLogger.debug('Memory stored successfully', {
      tenantId,
      memoryId,
      key,
      scope,
      isSensitive,
    });

    return memoryId;
  }

  /**
   * Retrieve memory by tenant with implicit tenant isolation
   */
  static async retrieveByTenant(
    tenantId: Domain.TenantId,
    key: MemoryKey
  ): Promise<MemoryRetrievalResult> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('memory_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('key', key)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Not found',
        };
      }
      StructuredLogger.error('Failed to retrieve memory by tenant', {
        tenantId,
        key,
        error: error.message,
      });
      throw new Error(`Failed to retrieve memory: ${error.message}`);
    }

    // Check if memory has expired
    if (data && data.ttl_ms && data.created_at) {
      const createdAt = new Date(data.created_at);
      const now = new Date();
      if (now.getTime() - createdAt.getTime() > data.ttl_ms) {
        // Clean up expired entry
        await db.from('memory_entries').delete().eq('id', data.id);
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Memory expired',
        };
      }
    }

    // Update access time
    await db
      .from('memory_entries')
      .update({ accessed_at: new Date().toISOString() })
      .eq('id', data.id);

    StructuredLogger.debug('Memory retrieved by tenant', {
      tenantId,
      key,
      scope: data.scope,
    });

    return {
      found: true,
      value: data.value,
      scope: data.scope,
    };
  }

  /**
   * Retrieve memory with permission checks
   */
  static async retrieveWithPermissions(
    tenantId: Domain.TenantId,
    userId: string,
    key: MemoryKey
  ): Promise<MemoryRetrievalResult> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('memory_entries')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('key', key)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Not found',
        };
      }
      throw new Error(`Failed to retrieve memory: ${error.message}`);
    }

    // Check permissions using retrieval policy
    const hasAccess = await RetrievalPolicy.checkAccess(
      tenantId,
      userId,
      data.scope,
      data.owner_id
    );

    if (!hasAccess) {
      StructuredLogger.warn('Access denied for memory retrieval', {
        tenantId,
        userId,
        key,
        scope: data.scope,
      });
      return {
        found: false,
        access_denied: true,
        scope: data.scope,
        reason: 'Permission denied',
      };
    }

    // Check if memory has expired
    if (data && data.ttl_ms && data.created_at) {
      const createdAt = new Date(data.created_at);
      const now = new Date();
      if (now.getTime() - createdAt.getTime() > data.ttl_ms) {
        await db.from('memory_entries').delete().eq('id', data.id);
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Memory expired',
        };
      }
    }

    // Update access time
    await db
      .from('memory_entries')
      .update({ accessed_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      found: true,
      value: data.value,
      scope: data.scope,
    };
  }

  /**
   * Get memory by ID with permission checks
   */
  static async getMemory(
    memoryId: MemoryId,
    userId: string
  ): Promise<MemoryRetrievalResult> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('memory_entries')
      .select('*')
      .eq('id', memoryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Not found',
        };
      }
      throw new Error(`Failed to get memory: ${error.message}`);
    }

    // Check permissions
    const hasAccess = await RetrievalPolicy.checkAccess(
      data.tenant_id,
      userId,
      data.scope,
      data.owner_id
    );

    if (!hasAccess) {
      return {
        found: false,
        access_denied: true,
        scope: data.scope,
        reason: 'Access denied',
      };
    }

    // Check expiration
    if (data.ttl_ms && data.created_at) {
      const createdAt = new Date(data.created_at);
      const now = new Date();
      if (now.getTime() - createdAt.getTime() > data.ttl_ms) {
        await db.from('memory_entries').delete().eq('id', data.id);
        return {
          found: false,
          scope: 'TENANT_ISOLATED',
          reason: 'Expired',
        };
      }
    }

    // Update access time
    await db
      .from('memory_entries')
      .update({ accessed_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      found: true,
      value: data.value,
      scope: data.scope,
    };
  }

  /**
   * Delete memory entry
   */
  static async deleteMemory(
    memoryId: MemoryId,
    userId: string
  ): Promise<boolean> {
    const db = getSupabaseAdmin();

    const { data: memory, error: fetchError } = await db
      .from('memory_entries')
      .select('owner_id, tenant_id')
      .eq('id', memoryId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch memory: ${fetchError.message}`);
    }

    // Only owner can delete
    if (memory.owner_id !== userId) {
      StructuredLogger.warn('Unauthorized delete attempt', {
        memoryId,
        userId,
        owner: memory.owner_id,
      });
      return false;
    }

    const { error: deleteError } = await db.from('memory_entries').delete().eq('id', memoryId);

    if (deleteError) {
      throw new Error(`Failed to delete memory: ${deleteError.message}`);
    }

    StructuredLogger.debug('Memory deleted', { memoryId, userId });
    return true;
  }

  /**
   * Get memory statistics for a tenant
   */
  static async getMemoryStats(tenantId: Domain.TenantId): Promise<ContextSummary> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('memory_entries')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to get memory stats: ${error.message}`);
    }

    const entries = data || [];
    const scopeCounts: Record<RetrievalScope, number> = {
      TENANT_ISOLATED: 0,
      WORKSPACE: 0,
      SYSTEM: 0,
    };

    let totalBytes = 0;
    let sensitiveCount = 0;
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    entries.forEach((entry) => {
      scopeCounts[entry.scope]++;
      totalBytes += JSON.stringify(entry.value).length;
      if (entry.is_sensitive) sensitiveCount++;

      const createdAt = new Date(entry.created_at);
      if (!oldestDate || createdAt < oldestDate) oldestDate = createdAt;
      if (!newestDate || createdAt > newestDate) newestDate = createdAt;
    });

    return {
      total_entries: entries.length,
      total_bytes: totalBytes,
      sensitive_count: sensitiveCount,
      scopes: scopeCounts,
      oldest_entry: oldestDate,
      newest_entry: newestDate,
    };
  }

  /**
   * Clean up expired memory entries
   */
  static async cleanupExpiredMemory(tenantId?: Domain.TenantId): Promise<number> {
    const db = getSupabaseAdmin();

    let query = db
      .from('memory_entries')
      .select('id, created_at, ttl_ms')
      .not('ttl_ms', 'is', null);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch entries for cleanup: ${error.message}`);
    }

    const now = new Date();
    const expiredIds: string[] = [];

    (data || []).forEach((entry) => {
      const createdAt = new Date(entry.created_at);
      if (now.getTime() - createdAt.getTime() > entry.ttl_ms) {
        expiredIds.push(entry.id);
      }
    });

    if (expiredIds.length === 0) {
      return 0;
    }

    const { error: deleteError } = await db
      .from('memory_entries')
      .delete()
      .in('id', expiredIds);

    if (deleteError) {
      throw new Error(`Failed to delete expired entries: ${deleteError.message}`);
    }

    StructuredLogger.info('Cleaned up expired memory entries', {
      tenantId,
      count: expiredIds.length,
    });

    return expiredIds.length;
  }

  /**
   * List all memory keys for a tenant
   */
  static async listMemoryKeys(
    tenantId: Domain.TenantId,
    scope?: RetrievalScope
  ): Promise<MemoryKey[]> {
    const db = getSupabaseAdmin();

    let query = db
      .from('memory_entries')
      .select('key')
      .eq('tenant_id', tenantId)
      .distinct();

    if (scope) {
      query = query.eq('scope', scope);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to list memory keys: ${error.message}`);
    }

    return (data || []).map((entry) => entry.key as MemoryKey);
  }

  /**
   * Get memory context for a task
   */
  static async getTaskContext(
    taskId: Domain.TaskId,
    userId: string
  ): Promise<Record<string, unknown>> {
    const db = getSupabaseAdmin();

    const { data: task, error: taskError } = await db
      .from('tasks')
      .select('tenant_id, id')
      .eq('id', taskId)
      .single();

    if (taskError) {
      throw new Error(`Failed to fetch task: ${taskError.message}`);
    }

    const { data: memories, error: memError } = await db
      .from('memory_entries')
      .select('key, value')
      .eq('tenant_id', task.tenant_id)
      .order('accessed_at', { ascending: false })
      .limit(100);

    if (memError) {
      throw new Error(`Failed to fetch task context: ${memError.message}`);
    }

    const context: Record<string, unknown> = {};
    for (const memory of memories || []) {
      const result = await this.retrieveWithPermissions(
        task.tenant_id,
        userId,
        memory.key as MemoryKey
      );
      if (result.found) {
        context[memory.key] = result.value;
      }
    }

    return context;
  }
}
