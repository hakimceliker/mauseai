import { describe, expect, it } from 'vitest';
import {
  MOUSEAI_PROJECT_ID,
  SenatechControlPlaneAdapter,
} from '@/src/lib/integrations/senatech-control-plane-adapter';

const request = {
  task: 'task_summary' as const,
  input: 'Summarize the completed task.',
  tenantId: 'tenant-demo',
  requestId: 'mouseai-test-001',
};

describe('SenatechControlPlaneAdapter', () => {
  it('keeps the MouseAI project, tenant, request and shadow flags bound', async () => {
    let received: Record<string, unknown> | undefined;
    const adapter = new SenatechControlPlaneAdapter(async (envelope) => {
      received = envelope as unknown as Record<string, unknown>;
      return {
        request_id: request.requestId,
        result: { output: 'validated summary', provider: 'local', model: 'mock', validated: true },
        usage: { state: 'completed', usage_basis: 'test', input_tokens: 3, output_tokens: 4, total_tokens: 7 },
      };
    });

    const result = await adapter.execute(request);

    expect(received).toMatchObject({
      project_id: MOUSEAI_PROJECT_ID,
      tenant_id: request.tenantId,
      request_id: request.requestId,
      local_only: true,
      allow_cloud: false,
      shadow_only: true,
    });
    expect(result).toMatchObject({
      projectId: MOUSEAI_PROJECT_ID,
      tenantId: request.tenantId,
      requestId: request.requestId,
      shadowOnly: true,
      validated: true,
    });
  });

  it('fails closed when no transport is explicitly configured', async () => {
    const adapter = new SenatechControlPlaneAdapter();

    await expect(adapter.execute(request)).rejects.toThrow('CONTROL_PLANE_NOT_CONFIGURED');
  });

  it('rejects invalid identity, disallowed tasks and approval-required actions before transport', async () => {
    let calls = 0;
    const adapter = new SenatechControlPlaneAdapter(async () => {
      calls += 1;
      return {};
    });

    await expect(adapter.execute({ ...request, tenantId: 'bad tenant' })).rejects.toThrow('CONTROL_PLANE_TENANT_REQUIRED');
    await expect(adapter.execute({ ...request, requestId: 'bad id!' })).rejects.toThrow('CONTROL_PLANE_INVALID_REQUEST_ID');
    await expect(adapter.execute({ ...request, task: 'task_execute', actionType: 'financial_action' })).rejects.toThrow('CONTROL_PLANE_APPROVAL_REQUIRED');
    expect(calls).toBe(0);
  });

  it('rejects mismatched or incomplete responses', async () => {
    const mismatched = new SenatechControlPlaneAdapter(async () => ({
      request_id: 'other-request',
      result: { output: 'wrong', validated: true },
      usage: { state: 'completed' },
    }));
    await expect(mismatched.execute(request)).rejects.toThrow('CONTROL_PLANE_REQUEST_ID_MISMATCH');

    const incomplete = new SenatechControlPlaneAdapter(async () => ({
      request_id: request.requestId,
      result: { output: '', validated: false },
      usage: { state: 'pending' },
    }));
    await expect(incomplete.execute(request)).rejects.toThrow('CONTROL_PLANE_NOT_COMPLETED');
  });
});
