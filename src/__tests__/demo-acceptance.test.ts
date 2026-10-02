import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/src/app/api/tasks/route';
import { TaskService } from '@/src/lib/services/task-service';

const demoTenantA = '00000000-0000-0000-0000-00000000d0a1';
const demoTenantB = '00000000-0000-0000-0000-00000000d0b1';

function requestHeaders(tenantId: string, userId: string) {
  return {
    'content-type': 'application/json',
    'x-tenant-id': tenantId,
    'x-user-id': userId,
  };
}

afterEach(() => {
  TaskService.clearAll();
  process.env.AUTH_PROVIDER = 'mock';
});

describe('demo acceptance harness', () => {
  it('keeps synthetic demo tenants isolated', async () => {
    process.env.AUTH_PROVIDER = 'mock';

    const create = (tenantId: string, userId: string, goal: string) => POST(
      new NextRequest('https://demo.local/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          workflow_id: 'demo-workflow',
          input: { goal },
          expected_output: 'A demo-only result',
          approval_state: 'pending',
        }),
        headers: requestHeaders(tenantId, userId),
      }),
    );

    expect((await create(demoTenantA, 'demo-user-a', 'Tenant A')).status).toBe(201);
    expect((await create(demoTenantB, 'demo-user-b', 'Tenant B')).status).toBe(201);

    const tenantAResponse = await GET(new NextRequest('https://demo.local/api/tasks', {
      headers: requestHeaders(demoTenantA, 'demo-user-a'),
    }));
    const tenantABody = await tenantAResponse.json();

    expect(tenantAResponse.status).toBe(200);
    expect(tenantABody.data).toHaveLength(1);
    expect(tenantABody.data[0]).toMatchObject({
      tenant_id: demoTenantA,
      user_id: 'demo-user-a',
      input: { goal: 'Tenant A' },
    });
    expect(tenantABody.data[0].input.__execution_contract.approval_state).toBe('pending');
  });

  it('rejects anonymous demo access and never requires a real password', async () => {
    process.env.AUTH_PROVIDER = 'mock';

    const response = await GET(new NextRequest('https://demo.local/api/tasks'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ success: false, error: { code: 'AUTH_ERROR' } });
    expect(JSON.stringify(body)).not.toMatch(/password|secret|token/i);
  });
});
