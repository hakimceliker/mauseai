import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeTask } from '@/src/inngest/functions/execute-task';
import { AIRouter } from '@/src/lib/ai/ai-router';
import { AuditService } from '@/src/lib/audit/audit-service';
import { CostTracker } from '@/src/lib/cost/cost-tracker';
import { IdempotencyRepository } from '@/src/lib/db/idempotency-repository';
import { TaskRepository } from '@/src/lib/db/task-repository';
import { WorkflowRepository } from '@/src/lib/db/workflow-repository';
import { AuditAction, TaskStatus } from '@/src/types/domain';

vi.mock('@/src/inngest/client', () => ({
  inngest: { createFunction: (...args: unknown[]) => args[2] },
}));
vi.mock('@/src/lib/db/supabase', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/src/lib/ai/ai-router', () => ({ AIRouter: { execute: vi.fn() } }));
vi.mock('@/src/lib/db/task-repository', () => ({
  TaskRepository: { getTask: vi.fn(), updateTaskStatus: vi.fn() },
}));
vi.mock('@/src/lib/db/checkpoint-repository', () => ({
  CheckpointRepository: { saveCheckpoint: vi.fn() },
}));
vi.mock('@/src/lib/db/idempotency-repository', () => ({
  IdempotencyRepository: { checkIdempotency: vi.fn(), recordExecution: vi.fn() },
}));
vi.mock('@/src/lib/db/workflow-repository', () => ({
  WorkflowRepository: { getSteps: vi.fn() },
}));
vi.mock('@/src/lib/cost/cost-tracker', () => ({
  CostTracker: { getTenantRemaining: vi.fn(), recordTaskCost: vi.fn() },
}));

type Handler = (context: {
  event: { data: { taskId: string; tenantId: string; workflowId: string } };
  step: { run: <T>(id: string, callback: () => Promise<T>) => Promise<T> };
}) => Promise<{ success: boolean; totalCost: number | null; metering_status: string }>;

const event = { data: { taskId: 'task-a', tenantId: 'tenant-a', workflowId: 'workflow-a' } };
const step = { run: async <T>(_id: string, callback: () => Promise<T>) => callback() };
const run = () => (executeTask as unknown as Handler)({ event, step });

function completionEvents() {
  return vi.mocked(AuditService.log).mock.calls.filter(call => call[1] === AuditAction.TASK_COMPLETED);
}

function expectCompletion(cost: number | null) {
  expect(completionEvents()).toEqual([[
    'tenant-a', AuditAction.TASK_COMPLETED, 'task', 'task-a', 'system',
    { cost, metering_status: cost === null ? 'unknown' : 'known' },
  ]]);
  expect(TaskRepository.updateTaskStatus).toHaveBeenCalledWith(
    'task-a', 'tenant-a', TaskStatus.COMPLETED, expect.any(Object)
  );
}

describe('executeTask completion audit and metering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('SENATECH_CONTROL_PLANE_ENABLED', 'true');
    vi.stubEnv('SENATECH_CONTROL_PLANE_TENANT_ID', 'tenant-a');
    vi.spyOn(AuditService, 'log').mockResolvedValue(undefined as never);
    vi.mocked(TaskRepository.getTask).mockResolvedValue({
      tenant_id: 'tenant-a', workflow_id: 'workflow-a',
    } as never);
    vi.mocked(WorkflowRepository.getSteps).mockResolvedValue([
      { id: 'step-a', order: 1, name: 'First' },
    ] as never);
    vi.mocked(CostTracker.getTenantRemaining).mockResolvedValue(100);
    vi.mocked(IdempotencyRepository.checkIdempotency).mockResolvedValue(null);
    vi.mocked(AIRouter.execute).mockResolvedValue({ role: 'assistant', content: 'done', provider: 'control-plane' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('audits fresh unknown-cost completion without recording a fabricated cost', async () => {
    await expect(run()).resolves.toMatchObject({ success: true, totalCost: null, metering_status: 'unknown' });
    expectCompletion(null);
    expect(CostTracker.recordTaskCost).not.toHaveBeenCalled();
    expect(vi.mocked(AuditService.log).mock.calls.some(call => call[1] === AuditAction.COST_INCURRED)).toBe(false);
  });

  it('audits cached unknown-cost completion without repeating provider execution', async () => {
    vi.mocked(IdempotencyRepository.checkIdempotency).mockResolvedValue({
      result: 'cached', provider: 'control-plane', metering_status: 'unknown',
    });
    await expect(run()).resolves.toMatchObject({ totalCost: null, metering_status: 'unknown' });
    expectCompletion(null);
    expect(AIRouter.execute).not.toHaveBeenCalled();
    expect(CostTracker.recordTaskCost).not.toHaveBeenCalled();
  });

  it('keeps mixed known and unknown task cost unknown', async () => {
    vi.mocked(WorkflowRepository.getSteps).mockResolvedValue([
      { id: 'step-a', order: 1, name: 'First' },
      { id: 'step-b', order: 2, name: 'Second' },
    ] as never);
    vi.mocked(AIRouter.execute)
      .mockResolvedValueOnce({ role: 'assistant', content: 'done', provider: 'control-plane', cost: 0.25 })
      .mockResolvedValueOnce({ role: 'assistant', content: 'done', provider: 'control-plane' });
    await expect(run()).resolves.toMatchObject({ totalCost: null, metering_status: 'unknown' });
    expectCompletion(null);
    expect(CostTracker.recordTaskCost).not.toHaveBeenCalled();
  });

  it.each([0, 0.25])('preserves known cost %s and records completion once', async cost => {
    vi.mocked(AIRouter.execute).mockResolvedValue({ role: 'assistant', content: 'done', provider: 'control-plane', cost });
    await expect(run()).resolves.toMatchObject({ totalCost: cost, metering_status: 'known' });
    expectCompletion(cost);
    expect(CostTracker.recordTaskCost).toHaveBeenCalledExactlyOnceWith('task-a', 'tenant-a', cost);
  });

  it('preserves legacy estimated metering when Control Plane is disabled', async () => {
    vi.stubEnv('SENATECH_CONTROL_PLANE_ENABLED', 'false');
    await expect(run()).resolves.toMatchObject({ totalCost: 0.0001, metering_status: 'known' });
    expectCompletion(0.0001);
    expect(CostTracker.recordTaskCost).toHaveBeenCalledExactlyOnceWith('task-a', 'tenant-a', 0.0001);
  });

  it('does not emit completion when provider execution fails', async () => {
    vi.mocked(AIRouter.execute).mockRejectedValue(new Error('provider failed'));
    await expect(run()).rejects.toThrow('provider failed');
    expect(completionEvents()).toEqual([]);
    expect(CostTracker.recordTaskCost).not.toHaveBeenCalled();
    expect(AuditService.log).toHaveBeenCalledWith(
      'tenant-a', AuditAction.TASK_FAILED, 'task', 'task-a', 'system', { error: 'provider failed' }
    );
  });
});
