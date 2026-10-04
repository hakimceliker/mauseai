/**
 * Trace Manager - Manages immutable trace IDs across task lifecycle
 */
import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';

export type TraceId = string & { readonly __brand: 'TraceId' };
export type TraceActionId = string & { readonly __brand: 'TraceActionId' };

export interface TraceAction {
  id: TraceActionId;
  trace_id: TraceId;
  task_id: Domain.TaskId;
  tenant_id: Domain.TenantId;
  action_type:
    | 'task_started'
    | 'agent_assigned'
    | 'judge_called'
    | 'evidence_collected'
    | 'cost_updated'
    | 'task_closed'
    | 'handoff_initiated'
    | 'step_executed'
    | 'checkpoint_created';
  actor: string;
  details: Record<string, unknown>;
  timestamp: Date;
  sequence: number;
}

export interface TraceInfo {
  trace_id: TraceId;
  task_id: Domain.TaskId;
  tenant_id: Domain.TenantId;
  action_count: number;
  first_action: TraceAction | null;
  last_action: TraceAction | null;
  duration_ms: number;
  status: 'active' | 'completed' | 'failed';
}

export interface TraceTimeline {
  trace_id: TraceId;
  actions: TraceAction[];
  duration_ms: number;
}

export class TraceManager {
  static generateTraceId(): TraceId {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12).padStart(10, '0');
    return `trace_${timestamp}_${random}` as TraceId;
  }

  static async createTrace(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId
  ): Promise<TraceId> {
    const traceId = this.generateTraceId();
    const db = getSupabaseAdmin();

    const { error } = await db.from('traces').insert({
      id: traceId,
      task_id: taskId,
      tenant_id: tenantId,
      status: 'active',
      action_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      StructuredLogger.error('Failed to create trace', {
        taskId,
        tenantId,
        error: error.message,
      });
      throw new Error(`Failed to create trace: ${error.message}`);
    }

    StructuredLogger.debug('Created trace', { traceId, taskId });
    return traceId;
  }

  static async getTraceId(taskId: Domain.TaskId): Promise<TraceId | null> {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('traces')
      .select('id')
      .eq('task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get trace: ${error.message}`);
    }

    return data?.id as TraceId;
  }

  static async linkToTrace(
    traceId: TraceId,
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId,
    actionType: TraceAction['action_type'],
    actor: string,
    details: Record<string, unknown> = {}
  ): Promise<TraceAction> {
    const db = getSupabaseAdmin();

    const { data: traceData, error: traceError } = await db
      .from('traces')
      .select('action_count')
      .eq('id', traceId)
      .single();

    if (traceError) {
      throw new Error(`Failed to get trace: ${traceError.message}`);
    }

    const sequence = (traceData?.action_count || 0) + 1;
    const actionId: TraceActionId = `action_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}` as TraceActionId;
    const now = new Date();

    const action: TraceAction = {
      id: actionId,
      trace_id: traceId,
      task_id: taskId,
      tenant_id: tenantId,
      action_type: actionType,
      actor,
      details,
      timestamp: now,
      sequence,
    };

    const { error: insertError } = await db.from('trace_actions').insert({
      id: actionId,
      trace_id: traceId,
      task_id: taskId,
      tenant_id: tenantId,
      action_type: actionType,
      actor,
      details,
      sequence,
      created_at: now.toISOString(),
    });

    if (insertError) {
      StructuredLogger.error('Failed to link action to trace', {
        traceId,
        taskId,
        actionType,
        error: insertError.message,
      });
      throw new Error(`Failed to link action: ${insertError.message}`);
    }

    const { error: updateError } = await db
      .from('traces')
      .update({
        action_count: sequence,
        updated_at: now.toISOString(),
      })
      .eq('id', traceId);

    if (updateError) {
      throw new Error(`Failed to update trace: ${updateError.message}`);
    }

    StructuredLogger.debug('Linked action to trace', {
      traceId,
      actionId,
      actionType,
      sequence,
    });

    return action;
  }

  static async getFullTrace(traceId: TraceId): Promise<TraceTimeline> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('trace_actions')
      .select('*')
      .eq('trace_id', traceId)
      .order('sequence', { ascending: true });

    if (error) {
      throw new Error(`Failed to get trace: ${error.message}`);
    }

    const actions: TraceAction[] = (data || []).map((action) => ({
      id: action.id as TraceActionId,
      trace_id: action.trace_id as TraceId,
      task_id: action.task_id as Domain.TaskId,
      tenant_id: action.tenant_id as Domain.TenantId,
      action_type: action.action_type,
      actor: action.actor,
      details: action.details || {},
      timestamp: new Date(action.created_at),
      sequence: action.sequence,
    }));

    const durationMs =
      actions.length > 1
        ? actions[actions.length - 1].timestamp.getTime() - actions[0].timestamp.getTime()
        : 0;

    return {
      trace_id: traceId,
      actions,
      duration_ms: durationMs,
    };
  }

  static async getTraceInfo(traceId: TraceId): Promise<TraceInfo> {
    const db = getSupabaseAdmin();

    const { data: trace, error: traceError } = await db
      .from('traces')
      .select('*')
      .eq('id', traceId)
      .single();

    if (traceError) {
      throw new Error(`Failed to get trace: ${traceError.message}`);
    }

    const timeline = await this.getFullTrace(traceId);

    return {
      trace_id: traceId,
      task_id: trace.task_id as Domain.TaskId,
      tenant_id: trace.tenant_id as Domain.TenantId,
      action_count: trace.action_count || 0,
      first_action: timeline.actions[0] || null,
      last_action: timeline.actions[timeline.actions.length - 1] || null,
      duration_ms: timeline.duration_ms,
      status: trace.status,
    };
  }

  static async completeTrace(
    traceId: TraceId,
    status: 'completed' | 'failed'
  ): Promise<void> {
    const db = getSupabaseAdmin();

    const { error } = await db
      .from('traces')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', traceId);

    if (error) {
      throw new Error(`Failed to complete trace: ${error.message}`);
    }

    StructuredLogger.debug('Trace completed', { traceId, status });
  }

  static async getTenantTraces(
    tenantId: Domain.TenantId,
    limit = 100
  ): Promise<TraceInfo[]> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('traces')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get tenant traces: ${error.message}`);
    }

    const traces: TraceInfo[] = [];

    for (const trace of data || []) {
      const timeline = await this.getFullTrace(trace.id as TraceId);
      traces.push({
        trace_id: trace.id as TraceId,
        task_id: trace.task_id as Domain.TaskId,
        tenant_id: trace.tenant_id as Domain.TenantId,
        action_count: trace.action_count || 0,
        first_action: timeline.actions[0] || null,
        last_action: timeline.actions[timeline.actions.length - 1] || null,
        duration_ms: timeline.duration_ms,
        status: trace.status,
      });
    }

    return traces;
  }

  static async getActionStats(traceId: TraceId): Promise<any> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('trace_actions')
      .select('action_type, actor')
      .eq('trace_id', traceId);

    if (error) {
      throw new Error(`Failed to get action stats: ${error.message}`);
    }

    const actions = data || [];
    const actionsByType: Record<string, number> = {};
    const actionsByActor: Record<string, number> = {};

    for (const action of actions) {
      actionsByType[action.action_type] = (actionsByType[action.action_type] || 0) + 1;
      actionsByActor[action.actor] = (actionsByActor[action.actor] || 0) + 1;
    }

    return {
      total_actions: actions.length,
      actions_by_type: actionsByType,
      actions_by_actor: actionsByActor,
    };
  }
}
