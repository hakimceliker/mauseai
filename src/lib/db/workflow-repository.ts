import { getSupabaseAdmin } from './supabase';
import * as Domain from '@/src/types/domain';

export interface WorkflowStepRecord {
  id: Domain.StepId;
  name: string;
  order: number;
  type: string;
  config: Record<string, unknown>;
}

/** Reads the tenant's persisted workflow graph; never invents production steps. */
export class WorkflowRepository {
  static async getSteps(workflowId: Domain.WorkflowId, tenantId: Domain.TenantId): Promise<WorkflowStepRecord[]> {
    const db = getSupabaseAdmin();
    const stepQuery = await db
      .from('steps')
      .select('id,name,order,type,config')
      .eq('workflow_id', workflowId)
      .order('order', { ascending: true });

    if (stepQuery.error) throw new Error(`Failed to load workflow steps: ${stepQuery.error.message}`);
    if (stepQuery.data?.length) return stepQuery.data as WorkflowStepRecord[];

    const workflowQuery = await db
      .from('workflows')
      .select('steps')
      .eq('id', workflowId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (workflowQuery.error) throw new Error(`Failed to load workflow: ${workflowQuery.error.message}`);
    const configured = Array.isArray(workflowQuery.data?.steps) ? workflowQuery.data.steps : [];
    return configured.map((step, index) => {
      const item = step as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.name !== 'string') {
        throw new Error('WORKFLOW_NOT_CONFIGURED');
      }
      return {
        id: item.id as Domain.StepId,
        name: item.name,
        order: typeof item.order === 'number' ? item.order : index + 1,
        type: typeof item.type === 'string' ? item.type : 'ai_call',
        config: (item.config as Record<string, unknown>) ?? {},
      };
    });
  }
}
