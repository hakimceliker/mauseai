import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertCostEvent, selectTask, insertAudit } = vi.hoisted(() => ({
  insertCostEvent: vi.fn(),
  selectTask: vi.fn(),
  insertAudit: vi.fn(),
}));

vi.mock('@/src/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    from: (table: string) => table === 'cost_events'
      ? { insert: insertCostEvent }
      : {
          select: () => ({
            eq: () => ({
              eq: () => ({ single: selectTask }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          }),
        },
  }),
}));

vi.mock('@/src/server/services/audit-service', () => ({
  writeAudit: insertAudit,
}));

import { recordCost } from '@/src/server/services/cost-service';

describe('recordCost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCostEvent.mockResolvedValue({ error: null });
    selectTask.mockResolvedValue({ data: { spent_cents: 7, budget_limit_cents: 100 }, error: null });
    insertAudit.mockResolvedValue(undefined);
  });

  it('persists unavailable usage and cost as null without inventing zeroes', async () => {
    await recordCost({
      tenantId: 'tenant-1',
      taskId: 'task-1',
      provider: 'openai',
      costCents: null,
      inputTokens: null,
      outputTokens: null,
    });

    expect(insertCostEvent).toHaveBeenCalledWith(expect.objectContaining({
      cost_cents: null,
      input_tokens: null,
      output_tokens: null,
    }));
    expect(insertAudit).toHaveBeenCalledWith(expect.objectContaining({
      costCents: null,
      payload: { inputTokens: null, outputTokens: null },
    }));
  });
});
