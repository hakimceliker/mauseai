import { describe, expect, it } from 'vitest';
import { evaluateHumanApproval } from '@/src/core/approval/human-approval';

const baseRequest = {
  action: 'production_deploy' as const,
  requestedBy: 'agent-1',
  requestedAt: new Date('2026-10-04T08:00:00.000Z'),
};

describe('human approval policy', () => {
  it('keeps a high-risk action pending by default', () => {
    expect(evaluateHumanApproval(baseRequest)).toEqual({
      decision: 'PENDING',
      reason: 'human approval is required before execution',
    });
  });

  it('accepts only an attributed human approval', () => {
    expect(evaluateHumanApproval({
      ...baseRequest,
      approvalId: 'approval-1',
      approvedBy: 'maintainer-1',
      approvedAt: new Date('2026-10-04T08:05:00.000Z'),
    }).decision).toBe('APPROVED');
  });

  it('rejects and expires requests explicitly', () => {
    expect(evaluateHumanApproval({
      ...baseRequest,
      rejectedBy: 'maintainer-1',
      rejectedAt: new Date('2026-10-04T08:05:00.000Z'),
    }).decision).toBe('REJECTED');
    expect(evaluateHumanApproval({
      ...baseRequest,
      expiresAt: new Date('2026-10-04T07:59:00.000Z'),
    }, new Date('2026-10-04T08:00:00.000Z')).decision).toBe('EXPIRED');
  });
});
