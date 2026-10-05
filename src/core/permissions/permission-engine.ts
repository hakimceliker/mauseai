export type PermissionDecision = 'ALLOW' | 'DENY' | 'REQUIRES_HUMAN_APPROVAL';
export type PermissionRisk = 'L1' | 'L2' | 'L3' | 'L4';

export interface PermissionRequest {
  agentId: string;
  toolId: string;
  tenantId: string;
  requestedTenantId: string;
  risk: PermissionRisk;
  allowlistedTools: readonly string[];
  humanApprovalRequired?: boolean;
  humanApprovalPassed?: boolean;
}

export interface PermissionResult {
  decision: PermissionDecision;
  reason: string;
}

const approvalRisks = new Set<PermissionRisk>(['L3', 'L4']);

/**
 * Fail-closed permission evaluation for agent/tool operations.
 * This policy is pure and intentionally does not perform the requested action.
 */
export function evaluatePermission(request: PermissionRequest): PermissionResult {
  if (!request.agentId || !request.toolId || !request.tenantId) {
    return { decision: 'DENY', reason: 'agent, tool, and tenant are required' };
  }

  if (request.tenantId !== request.requestedTenantId) {
    return { decision: 'DENY', reason: 'cross-tenant access is denied' };
  }

  if (!request.allowlistedTools.includes(request.toolId)) {
    return { decision: 'DENY', reason: 'tool is not allowlisted for this agent' };
  }

  const approvalRequired = request.humanApprovalRequired || approvalRisks.has(request.risk);
  if (approvalRequired && !request.humanApprovalPassed) {
    return { decision: 'REQUIRES_HUMAN_APPROVAL', reason: 'human approval is required' };
  }

  return { decision: 'ALLOW', reason: 'permission policy passed' };
}
