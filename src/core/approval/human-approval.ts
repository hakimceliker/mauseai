export type ApprovalDecision = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type ApprovalAction =
  | 'production_deploy'
  | 'dns_change'
  | 'secret_change'
  | 'payment'
  | 'critical_merge'
  | 'branch_delete'
  | 'force_push'
  | 'production_data_change'
  | 'infrastructure_change';

export interface ApprovalRequest {
  action: ApprovalAction;
  requestedBy: string;
  requestedAt: Date;
  expiresAt?: Date;
  approvalId?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
}

export interface ApprovalEvaluation {
  decision: ApprovalDecision;
  reason: string;
}

export function evaluateHumanApproval(
  request: ApprovalRequest,
  now = new Date(),
): ApprovalEvaluation {
  if (!request.requestedBy || !request.action) {
    return { decision: 'REJECTED', reason: 'approval action and requester are required' };
  }

  if (request.expiresAt && request.expiresAt.getTime() <= now.getTime()) {
    return { decision: 'EXPIRED', reason: 'approval request has expired' };
  }

  if (request.rejectedBy) {
    return { decision: 'REJECTED', reason: 'approval was rejected by a human reviewer' };
  }

  if (request.approvedBy && request.approvedAt) {
    return { decision: 'APPROVED', reason: 'approval was recorded by a human reviewer' };
  }

  return { decision: 'PENDING', reason: 'human approval is required before execution' };
}
