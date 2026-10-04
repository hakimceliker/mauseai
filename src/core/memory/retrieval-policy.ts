/**
 * Retrieval Policy - Defines retrieval rules and access control
 * TENANT_ISOLATED: Only within tenant, owner access
 * WORKSPACE: Within workspace scope
 * SYSTEM: System-wide read-only
 */

import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';

export type RetrievalScope = 'TENANT_ISOLATED' | 'WORKSPACE' | 'SYSTEM';

export interface RetrievalRule {
  scope: RetrievalScope;
  readable_by: 'owner' | 'workspace' | 'system';
  writable_by: 'owner';
  deletable_by: 'owner';
  cacheable: boolean;
  ttl_default_ms: number;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  scope: RetrievalScope;
}

/**
 * RetrievalPolicy enforces access control based on scope and user role
 */
export class RetrievalPolicy {
  /**
   * Get retrieval rules for a scope
   */
  static getRule(scope: RetrievalScope): RetrievalRule {
    const rules: Record<RetrievalScope, RetrievalRule> = {
      TENANT_ISOLATED: {
        scope: 'TENANT_ISOLATED',
        readable_by: 'owner',
        writable_by: 'owner',
        deletable_by: 'owner',
        cacheable: true,
        ttl_default_ms: 3600000, // 1 hour
      },
      WORKSPACE: {
        scope: 'WORKSPACE',
        readable_by: 'workspace',
        writable_by: 'owner',
        deletable_by: 'owner',
        cacheable: true,
        ttl_default_ms: 1800000, // 30 minutes
      },
      SYSTEM: {
        scope: 'SYSTEM',
        readable_by: 'system',
        writable_by: 'owner',
        deletable_by: 'owner',
        cacheable: true,
        ttl_default_ms: 300000, // 5 minutes
      },
    };

    return rules[scope];
  }

  /**
   * Check if user has access to memory with given scope
   */
  static async checkAccess(
    tenantId: Domain.TenantId,
    userId: string,
    scope: RetrievalScope,
    ownerId: string
  ): Promise<boolean> {
    const rule = this.getRule(scope);

    // Owner always has access
    if (userId === ownerId) {
      return true;
    }

    switch (rule.readable_by) {
      case 'owner':
        // Only owner can read TENANT_ISOLATED
        return false;

      case 'workspace':
        // Check if both users are in same workspace
        return await this.isInSameWorkspace(tenantId, userId, ownerId);

      case 'system':
        // System-wide access (read-only)
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if users are in the same workspace
   */
  private static async isInSameWorkspace(
    tenantId: Domain.TenantId,
    userId1: string,
    userId2: string
  ): Promise<boolean> {
    const db = getSupabaseAdmin();

    const { data: user1Workspaces, error: error1 } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId1);

    const { data: user2Workspaces, error: error2 } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId2);

    if (error1 || error2) {
      StructuredLogger.error('Failed to check workspace membership', {
        tenantId,
        user1: userId1,
        user2: userId2,
        error1: error1?.message,
        error2: error2?.message,
      });
      return false;
    }

    const workspaces1 = (user1Workspaces || []).map((w) => w.workspace_id);
    const workspaces2 = (user2Workspaces || []).map((w) => w.workspace_id);

    const commonWorkspace = workspaces1.some((ws) => workspaces2.includes(ws));
    return commonWorkspace;
  }

  /**
   * Get effective access level for user and scope
   */
  static getAccessLevel(
    userId: string,
    scope: RetrievalScope,
    ownerId: string
  ): 'full' | 'read' | 'none' {
    if (userId === ownerId) {
      return 'full';
    }

    const rule = this.getRule(scope);
    if (rule.readable_by === 'owner') {
      return 'none';
    }

    if (rule.readable_by === 'workspace' || rule.readable_by === 'system') {
      return 'read';
    }

    return 'none';
  }

  /**
   * Validate scope parameter
   */
  static isValidScope(scope: unknown): scope is RetrievalScope {
    return scope === 'TENANT_ISOLATED' || scope === 'WORKSPACE' || scope === 'SYSTEM';
  }

  /**
   * Get default TTL for scope
   */
  static getDefaultTtl(scope: RetrievalScope): number {
    return this.getRule(scope).ttl_default_ms;
  }

  /**
   * Check if scope allows caching
   */
  static isCacheable(scope: RetrievalScope): boolean {
    return this.getRule(scope).cacheable;
  }

  /**
   * Get all retrieval rules
   */
  static getAllRules(): Record<RetrievalScope, RetrievalRule> {
    return {
      TENANT_ISOLATED: this.getRule('TENANT_ISOLATED'),
      WORKSPACE: this.getRule('WORKSPACE'),
      SYSTEM: this.getRule('SYSTEM'),
    };
  }

  /**
   * Check if user can write to memory with given scope
   */
  static canWrite(userId: string, scope: RetrievalScope, ownerId: string): boolean {
    const rule = this.getRule(scope);
    // Only owner can write
    return userId === ownerId && rule.writable_by === 'owner';
  }

  /**
   * Check if user can delete memory with given scope
   */
  static canDelete(userId: string, scope: RetrievalScope, ownerId: string): boolean {
    const rule = this.getRule(scope);
    // Only owner can delete
    return userId === ownerId && rule.deletable_by === 'owner';
  }
}
