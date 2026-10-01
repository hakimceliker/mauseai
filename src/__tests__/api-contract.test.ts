import { describe, expect, it } from 'vitest';
import { CreateTaskRequestSchema } from '@/src/lib/schemas/api-requests';
import { ApiErrorHandler, AuthError } from '@/src/lib/errors/api-error-handler';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { NextRequest } from 'next/server';

describe('F3 API contract', () => {
  it('accepts an explicit execution contract', () => {
    const result = CreateTaskRequestSchema.parse({
      workflow_id: 'workflow-1',
      input: { goal: 'safe test' },
      expected_output: 'A redacted report',
      success_criteria: ['Report is generated', 'No secret is exposed'],
    });

    expect(result.approval_state).toBeUndefined();
    expect(result.success_criteria).toHaveLength(2);
  });

  it('rejects an empty success criterion', () => {
    const result = CreateTaskRequestSchema.safeParse({
      workflow_id: 'workflow-1',
      success_criteria: ['   '],
    });

    expect(result.success).toBe(false);
  });

  it('maps missing mock authentication to AuthError', () => {
    const request = new NextRequest('http://localhost/api/tasks');

    expect(() => requireAuth(request)).toThrow(AuthError);
    const response = ApiErrorHandler.handle(new AuthError());
    expect(response.status).toBe(401);
  });
});
