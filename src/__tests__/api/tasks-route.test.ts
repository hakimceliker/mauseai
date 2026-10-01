import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/src/app/api/tasks/route';
import { TaskService } from '@/src/lib/services/task-service';

const tenantA = '00000000-0000-0000-0000-0000000000a1';
const tenantB = '00000000-0000-0000-0000-0000000000b1';

afterEach(() => {
  TaskService.clearAll();
  process.env.AUTH_PROVIDER = 'mock';
});

describe('tasks API route contract', () => {
  it('rejects anonymous creation with a safe 401 response', async () => {
    const request = new NextRequest('https://example.test/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: 'workflow-1' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ success: false, error: { code: 'AUTH_ERROR', message: 'Unauthorized' } });
    expect(JSON.stringify(body)).not.toContain('missing auth headers');
  });

  it('creates and lists only the authenticated tenant tasks', async () => {
    const create = (tenantId: string, userId: string, goal: string) => POST(new NextRequest('https://example.test/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: 'workflow-1', input: { goal } }),
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId, 'x-user-id': userId },
    }));

    expect((await create(tenantA, 'user-a', 'A only')).status).toBe(201);
    expect((await create(tenantB, 'user-b', 'B only')).status).toBe(201);

    const response = await GET(new NextRequest('https://example.test/api/tasks', {
      headers: { 'x-tenant-id': tenantA, 'x-user-id': 'user-a' },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ tenant_id: tenantA, user_id: 'user-a', input: { goal: 'A only' } });
  });

  it('rejects invalid task input before persistence', async () => {
    const response = await POST(new NextRequest('https://example.test/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: 'not-a-tenant-id', success_criteria: ['   '] }),
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantA, 'x-user-id': 'user-a' },
    }));

    expect(response.status).toBe(400);
    const listResponse = await GET(new NextRequest('https://example.test/api/tasks', {
      headers: { 'x-tenant-id': tenantA, 'x-user-id': 'user-a' },
    }));
    expect(await listResponse.json()).toMatchObject({ success: true, data: [] });
  });
});
