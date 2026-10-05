import { describe, expect, it } from 'vitest';
import { evaluatePermission } from '@/src/core/permissions/permission-engine';

const baseRequest = {
  agentId: 'agent-1',
  toolId: 'search',
  tenantId: 'tenant-a',
  requestedTenantId: 'tenant-a',
  risk: 'L1' as const,
  allowlistedTools: ['search'],
};

describe('permission engine', () => {
  it('allows an allowlisted same-tenant low-risk tool', () => {
    expect(evaluatePermission(baseRequest)).toEqual({
      decision: 'ALLOW',
      reason: 'permission policy passed',
    });
  });

  it('denies cross-tenant access', () => {
    expect(evaluatePermission({ ...baseRequest, requestedTenantId: 'tenant-b' })).toEqual({
      decision: 'DENY',
      reason: 'cross-tenant access is denied',
    });
  });

  it('denies tools outside the agent allowlist', () => {
    expect(evaluatePermission({ ...baseRequest, toolId: 'deploy' })).toEqual({
      decision: 'DENY',
      reason: 'tool is not allowlisted for this agent',
    });
  });

  it('requires human approval for high-risk actions', () => {
    expect(evaluatePermission({ ...baseRequest, risk: 'L4' })).toEqual({
      decision: 'REQUIRES_HUMAN_APPROVAL',
      reason: 'human approval is required',
    });
    expect(evaluatePermission({ ...baseRequest, risk: 'L4', humanApprovalPassed: true }).decision).toBe('ALLOW');
  });
});
