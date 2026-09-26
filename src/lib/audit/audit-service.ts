import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';

/**
 * Audit logging service for tracking all significant events
 */
export class AuditService {
  /**
   * Log an audit event
   */
  static async log(
    tenantId: Domain.TenantId,
    action: Domain.AuditAction,
    entityType: 'task' | 'step' | 'checkpoint' | 'cost',
    entityId: string,
    actor: string,
    details: Record<string, unknown> = {}
  ): Promise<Domain.AuditEvent> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('audit_logs')
      .insert({
        tenant_id: tenantId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        actor,
        details,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to log audit event: ${error.message}`);
    }

    return this.formatAuditEvent(data);
  }

  /**
   * Log task created event
   */
  static async logTaskCreated(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    userId: string,
    workflowId: Domain.WorkflowId
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.TASK_CREATED, 'task', taskId, userId, {
      workflow_id: workflowId,
    });
  }

  /**
   * Log task started event
   */
  static async logTaskStarted(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.TASK_STARTED, 'task', taskId, 'system');
  }

  /**
   * Log task completed event
   */
  static async logTaskCompleted(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    cost: number
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.TASK_COMPLETED, 'task', taskId, 'system', {
      cost,
    });
  }

  /**
   * Log task failed event
   */
  static async logTaskFailed(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    error: string
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.TASK_FAILED, 'task', taskId, 'system', {
      error,
    });
  }

  /**
   * Log cost incurred event
   */
  static async logCostIncurred(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    cost: number,
    provider: string
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.COST_INCURRED, 'cost', taskId, 'system', {
      cost,
      provider,
    });
  }

  /**
   * Log cost limit exceeded event
   */
  static async logCostLimitExceeded(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    currentCost: number,
    limit: number
  ): Promise<void> {
    await this.log(tenantId, Domain.AuditAction.COST_INCURRED, 'cost', taskId, 'system', {
      reason: 'cost_limit_exceeded',
      current_cost: currentCost,
      limit,
    });
  }

  /**
   * Get audit logs for a tenant
   */
  static async getTenantAuditLogs(
    tenantId: Domain.TenantId,
    limit = 100
  ): Promise<Domain.AuditEvent[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('audit_logs')
      .select()
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data.map(log => this.formatAuditEvent(log));
  }

  /**
   * Format database audit event to domain model
   */
  private static formatAuditEvent(data: Record<string, unknown>): Domain.AuditEvent {
    return {
      id: data.id as Domain.AuditEventId,
      tenant_id: data.tenant_id as Domain.TenantId,
      action: data.action as Domain.AuditAction,
      entity_type: data.entity_type as 'task' | 'step' | 'checkpoint' | 'cost',
      entity_id: data.entity_id as string,
      actor: data.actor as string,
      details: data.details as Record<string, unknown>,
      timestamp: new Date(data.timestamp as string),
    };
  }
}
