export type EvidenceGateStatus = 'CLOSED' | 'REVIEW' | 'BLOCKED';

export interface EvidenceGateInput {
  branchShaVerified: boolean;
  requiredCiPassed: boolean;
  testsPassed: boolean;
  evidenceComplete: boolean;
  independentReviewPassed: boolean;
  judgePassed: boolean;
  dependenciesVerified: boolean;
  humanApprovalRequired?: boolean;
  humanApprovalPassed?: boolean;
}

export interface EvidenceGateResult {
  status: EvidenceGateStatus;
  missing: string[];
  canClose: boolean;
}

const requiredChecks: Array<[keyof EvidenceGateInput, string]> = [
  ['branchShaVerified', 'branch/SHA verification'],
  ['requiredCiPassed', 'required CI'],
  ['testsPassed', 'tests'],
  ['evidenceComplete', 'evidence'],
  ['independentReviewPassed', 'independent review'],
  ['judgePassed', 'Judge'],
  ['dependenciesVerified', 'dependency verification'],
];

/**
 * Centralizes the fail-closed acceptance rule. This is deliberately pure so it
 * can be reused by API, worker, CLI, and test runners without side effects.
 */
export function evaluateEvidenceGate(input: EvidenceGateInput): EvidenceGateResult {
  const missing = requiredChecks
    .filter(([key]) => !input[key])
    .map(([, label]) => label);

  if (input.humanApprovalRequired && !input.humanApprovalPassed) {
    missing.push('human approval');
  }

  const canClose = missing.length === 0;
  const status: EvidenceGateStatus = canClose
    ? 'CLOSED'
    : input.branchShaVerified && input.requiredCiPassed && input.testsPassed && input.evidenceComplete
      ? 'REVIEW'
      : 'BLOCKED';

  return { status, missing, canClose };
}
