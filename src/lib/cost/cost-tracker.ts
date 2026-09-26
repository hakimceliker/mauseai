import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';

/**
 * Cost tracking and tenant limit enforcement
 */
export class CostTracker {
  /**
   * Get current monthly cost for a tenant
   */
  static async getTenantCost(tenantId: Domain.TenantId): Promise<number> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tasks')
      .select('cost_actual')
      .eq('tenant_id', tenantId)
      .not('cost_actual', 'is', null);

    if (error) {
      throw new Error(`Failed to get tenant cost: ${error.message}`);
    }

    return (data as { cost_actual: number }[]).reduce((sum, task) => {
      return sum + (task.cost_actual || 0);
    }, 0);
  }

  /**
   * Get tenant monthly credit limit
   */
  static async getTenantLimit(tenantId: Domain.TenantId): Promise<number> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('tenants')
      .select('monthly_limit')
      .eq('id', tenantId)
      .single();

    if (error) {
      throw new Error(`Failed to get tenant limit: ${error.message}`);
    }

    return Number(data?.monthly_limit || 0);
  }

  /**
   * Get remaining credit for a tenant
   */
  static async getTenantRemaining(tenantId: Domain.TenantId): Promise<number> {
    const [cost, limit] = await Promise.all([
      this.getTenantCost(tenantId),
      this.getTenantLimit(tenantId),
    ]);

    return Math.max(0, limit - cost);
  }

  /**
   * Check if tenant can execute a step with estimated cost
   */
  static async canExecuteStep(
    tenantId: Domain.TenantId,
    estimatedCost: number
  ): Promise<boolean> {
    const remaining = await this.getTenantRemaining(tenantId);
    return remaining >= estimatedCost;
  }

  /**
   * Update task cost after execution
   */
  static async recordTaskCost(
    taskId: Domain.TaskId,
    tenantId: Domain.TenantId,
    cost: number
  ): Promise<void> {
    const db = getSupabaseAdmin();

    const { error } = await db
      .from('tasks')
      .update({
        cost_actual: cost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to record task cost: ${error.message}`);
    }
  }
}
