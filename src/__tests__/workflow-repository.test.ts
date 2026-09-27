import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WorkflowRepository } from '@/src/lib/db/workflow-repository';
import { getSupabaseAdmin } from '@/src/lib/db/supabase';

vi.mock('@/src/lib/db/supabase', () => ({ getSupabaseAdmin: vi.fn() }));

describe('WorkflowRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads ordered persisted steps for a tenant workflow', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'step-b', name: 'Second', order: 2, type: 'ai_call', config: {} }, { id: 'step-a', name: 'First', order: 1, type: 'ai_call', config: {} }],
      error: null,
    });
    const query = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }) }) };
    vi.mocked(getSupabaseAdmin).mockReturnValue(query as never);

    const steps = await WorkflowRepository.getSteps('workflow-1' as never, 'tenant-1' as never);
    expect(steps).toHaveLength(2);
    expect(order).toHaveBeenCalledWith('order', { ascending: true });
  });

  it('rejects an unconfigured workflow instead of inventing steps', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { steps: [] }, error: null });
    const eqTenant = vi.fn().mockReturnValue({ maybeSingle });
    const eqWorkflow = vi.fn().mockReturnValue({ eq: eqTenant });
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const query = { from: vi.fn()
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order }) }) })
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq: eqWorkflow }) }) };
    vi.mocked(getSupabaseAdmin).mockReturnValue(query as never);

    await expect(WorkflowRepository.getSteps('workflow-1' as never, 'tenant-1' as never)).resolves.toEqual([]);
    expect(maybeSingle).toHaveBeenCalled();
  });
});
