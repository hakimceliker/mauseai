import { describe, expect, it } from 'vitest';
import { evaluateEvidenceGate } from '@/src/core/evidence/evidence-gate';

const complete = {
  branchShaVerified: true,
  requiredCiPassed: true,
  testsPassed: true,
  evidenceComplete: true,
  independentReviewPassed: true,
  judgePassed: true,
  dependenciesVerified: true,
};

describe('evidence gate', () => {
  it('closes only when all acceptance conditions are satisfied', () => {
    expect(evaluateEvidenceGate(complete)).toEqual({
      status: 'CLOSED',
      missing: [],
      canClose: true,
    });
  });

  it('keeps technically ready work in review without independent acceptance', () => {
    expect(evaluateEvidenceGate({ ...complete, independentReviewPassed: false })).toEqual({
      status: 'REVIEW',
      missing: ['independent review'],
      canClose: false,
    });
  });

  it('blocks when the technical evidence is incomplete', () => {
    expect(evaluateEvidenceGate({ ...complete, evidenceComplete: false, requiredCiPassed: false })).toEqual({
      status: 'BLOCKED',
      missing: ['required CI', 'evidence'],
      canClose: false,
    });
  });

  it('requires human approval only for high-risk operations', () => {
    expect(evaluateEvidenceGate({
      ...complete,
      humanApprovalRequired: true,
      humanApprovalPassed: false,
    })).toEqual({
      status: 'REVIEW',
      missing: ['human approval'],
      canClose: false,
    });
  });
});
