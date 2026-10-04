/**
 * Cost Controller - Budget enforcement, alarms, and cost tracking
 */
import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { StructuredLogger } from '@/src/lib/logging/structured-logger';

export type CostTrackingId = string & { readonly __brand: 'CostTrackingId' };

export interface CostEntry {
  id: CostTrackingId;
  task_id: Domain.TaskId;
  tenant_id: Domain.TenantId;
  amount: number;
  provider: string;
  model?: string;
  metadata: Record<string, unknown>;
  recorded_at: Date;
}

export interface BudgetStatus {
  tenant_id: Domain.TenantId;
  monthly_limit: number;
  current_usage: number;
  remaining_budget: number;
  usage_percent: number;
  alarm_triggered: boolean;
  alarm_threshold_percent: number;
}

export interface CostBreakdown {
  total_cost: number;
  by_provider: Record<string, number>;
  by_task: Record<string, number>;
  by_model: Record<string, number>;
}

export interface BudgetEnforcementResult {
  allowed: boolean;
  reason?: string;
  current_cost: number;
  estimated_new_cost: number;
  remaining_budget: number;
  will_exceed: boolean;
}

export class CostController {
  private static readonly ALARM_THRESHOLD_PERCENT = 80;
  private static readonly CRITICAL_THRESHOLD_PERCENT = 95;

  static async trackCost(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId,
    cost: number,
    provider: string,
    model?: string,
    metadata?: Record<string, unknown>
  ): Promise<CostTrackingId> {
    const db = getSupabaseAdmin();

    const id: CostTrackingId = `cost_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}` as CostTrackingId;

    const { error } = await db.from('cost_tracking').insert({
      id,
      task_id: taskId,
      tenant_id: tenantId,
      amount: cost,
      provider,
      model,
      metadata: metadata || {},
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      StructuredLogger.error('Failed to track cost', {
        taskId,
        tenantId,
        cost,
        error: error.message,
      });
      throw new Error(`Failed to track cost: ${error.message}`);
    }

    StructuredLogger.debug('Cost tracked', {
      taskId,
      tenantId,
      cost,
      provider,
    });

    return id;
  }

  static async enforceBudget(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    estimatedCost: number
  ): Promise<BudgetEnforcementResult> {
    const db = getSupabaseAdmin();

    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('monthly_limit')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      StructuredLogger.error('Failed to get tenant budget', {
        tenantId,
        error: tenantError.message,
      });
      throw new Error(`Failed to get tenant budget: ${tenantError.message}`);
    }

    const monthlyLimit = Number(tenant?.monthly_limit || 0);

    const { data: costs, error: costError } = await db
      .from('cost_tracking')
      .select('amount')
      .eq('tenant_id', tenantId);

    if (costError) {
      throw new Error(`Failed to get cost data: ${costError.message}`);
    }

    const currentCost = (costs || []).reduce((sum, cost) => sum + cost.amount, 0);
    const newTotalCost = currentCost + estimatedCost;
    const remainingBudget = Math.max(0, monthlyLimit - currentCost);

    if (newTotalCost > monthlyLimit) {
      StructuredLogger.warn('Budget limit would be exceeded', {
        tenantId,
        taskId,
        currentCost,
        estimatedCost,
        newTotal: newTotalCost,
        limit: monthlyLimit,
      });

      return {
        allowed: false,
        reason: 'Insufficient budget: task would exceed monthly limit',
        current_cost: currentCost,
        estimated_new_cost: newTotalCost,
        remaining_budget: remainingBudget,
        will_exceed: true,
      };
    }

    const usagePercent = (newTotalCost / monthlyLimit) * 100;
    if (usagePercent >= this.CRITICAL_THRESHOLD_PERCENT) {
      StructuredLogger.error('Critical budget threshold reached', {
        tenantId,
        usagePercent: usagePercent.toFixed(2),
      });
    } else if (usagePercent >= this.ALARM_THRESHOLD_PERCENT) {
      StructuredLogger.warn('Budget alarm threshold reached', {
        tenantId,
        usagePercent: usagePercent.toFixed(2),
      });
    }

    StructuredLogger.debug('Budget enforcement passed', {
      taskId,
      tenantId,
      currentCost,
      estimatedCost,
      newTotal: newTotalCost,
      limit: monthlyLimit,
      usagePercent: usagePercent.toFixed(2),
    });

    return {
      allowed: true,
      current_cost: currentCost,
      estimated_new_cost: newTotalCost,
      remaining_budget: remainingBudget,
      will_exceed: false,
    };
  }

  static async getBudgetStatus(tenantId: Domain.TenantId): Promise<BudgetStatus> {
    const db = getSupabaseAdmin();

    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('monthly_limit')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      throw new Error(`Failed to get tenant: ${tenantError.message}`);
    }

    const { data: costs, error: costError } = await db
      .from('cost_tracking')
      .select('amount')
      .eq('tenant_id', tenantId);

    if (costError) {
      throw new Error(`Failed to get costs: ${costError.message}`);
    }

    const monthlyLimit = Number(tenant?.monthly_limit || 0);
    const currentUsage = (costs || []).reduce((sum, cost) => sum + cost.amount, 0);
    const usagePercent = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0;
    const alarmTriggered = usagePercent >= this.ALARM_THRESHOLD_PERCENT;

    return {
      tenant_id: tenantId,
      monthly_limit: monthlyLimit,
      current_usage: currentUsage,
      remaining_budget: Math.max(0, monthlyLimit - currentUsage),
      usage_percent: usagePercent,
      alarm_triggered: alarmTriggered,
      alarm_threshold_percent: this.ALARM_THRESHOLD_PERCENT,
    };
  }

  static async triggerAlarm(tenantId: Domain.TenantId): Promise<boolean> {
    const status = await this.getBudgetStatus(tenantId);

    if (status.alarm_triggered) {
      StructuredLogger.warn('Cost alarm triggered for tenant', {
        tenantId,
        usage: status.current_usage.toFixed(2),
        limit: status.monthly_limit.toFixed(2),
        usagePercent: status.usage_percent.toFixed(2),
      });

      return true;
    }

    return false;
  }

  static async reportCost(tenantId: Domain.TenantId): Promise<CostBreakdown> {
    const db = getSupabaseAdmin();

    const { data: costs, error } = await db
      .from('cost_tracking')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to get cost data: ${error.message}`);
    }

    const entries = costs || [];
    const breakdown: CostBreakdown = {
      total_cost: 0,
      by_provider: {},
      by_task: {},
      by_model: {},
    };

    for (const entry of entries) {
      breakdown.total_cost += entry.amount;

      if (!breakdown.by_provider[entry.provider]) {
        breakdown.by_provider[entry.provider] = 0;
      }
      breakdown.by_provider[entry.provider] += entry.amount;

      if (!breakdown.by_task[entry.task_id]) {
        breakdown.by_task[entry.task_id] = 0;
      }
      breakdown.by_task[entry.task_id] += entry.amount;

      if (entry.model) {
        if (!breakdown.by_model[entry.model]) {
          breakdown.by_model[entry.model] = 0;
        }
        breakdown.by_model[entry.model] += entry.amount;
      }
    }

    return breakdown;
  }

  static async getTaskCost(taskId: Domain.TaskId): Promise<number> {
    const db = getSupabaseAdmin();

    const { data: costs, error } = await db
      .from('cost_tracking')
      .select('amount')
      .eq('task_id', taskId);

    if (error) {
      throw new Error(`Failed to get task cost: ${error.message}`);
    }

    return (costs || []).reduce((sum, cost) => sum + cost.amount, 0);
  }

  static async canExecuteTask(
    tenantId: Domain.TenantId,
    taskId: Domain.TaskId,
    estimatedCost: number
  ): Promise<boolean> {
    const result = await this.enforceBudget(tenantId, taskId, estimatedCost);
    return result.allowed;
  }

  static async getCostAlerts(tenantId: Domain.TenantId): Promise<Array<{
    level: 'warning' | 'critical';
    message: string;
    usage_percent: number;
  }>> {
    const status = await this.getBudgetStatus(tenantId);
    const alerts: Array<{
      level: 'warning' | 'critical';
      message: string;
      usage_percent: number;
    }> = [];

    if (status.usage_percent >= this.CRITICAL_THRESHOLD_PERCENT) {
      alerts.push({
        level: 'critical',
        message: `Critical: Cost usage at ${status.usage_percent.toFixed(1)}% of monthly budget`,
        usage_percent: status.usage_percent,
      });
    } else if (status.usage_percent >= this.ALARM_THRESHOLD_PERCENT) {
      alerts.push({
        level: 'warning',
        message: `Warning: Cost usage at ${status.usage_percent.toFixed(1)}% of monthly budget`,
        usage_percent: status.usage_percent,
      });
    }

    return alerts;
  }
}
