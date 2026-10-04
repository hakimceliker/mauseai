/**
 * Human Approval System - Critical Operations Approval
 *
 * Implements fail-closed approval model for critical operations:
 * - Default: DENY
 * - Requires explicit APPROVE decision
 * - Automatic timeout rejection
 * - Immutable audit trail
 */

import { EventEmitter } from 'events';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum OperationType {
  PRODUCTION_DEPLOY = 'PRODUCTION_DEPLOY',
  DATABASE_MIGRATION = 'DATABASE_MIGRATION',
  INFRASTRUCTURE_CHANGE = 'INFRASTRUCTURE_CHANGE',
  DATA_DELETE = 'DATA_DELETE',
  DATABASE_SCHEMA_CHANGE = 'DATABASE_SCHEMA_CHANGE',
  PRODUCTION_DATA_DELETE = 'PRODUCTION_DATA_DELETE',
  SECRET_CREATE = 'SECRET_CREATE',
  SECRET_MODIFY = 'SECRET_MODIFY',
  DNS_CHANGE = 'DNS_CHANGE',
  FORCE_PUSH = 'FORCE_PUSH',
  DELETE_BRANCH = 'DELETE_BRANCH',
  PROTECTED_MERGE = 'PROTECTED_MERGE',
  PAYMENT_TRANSACTION = 'PAYMENT_TRANSACTION',
  SUBSCRIPTION_CREATE = 'SUBSCRIPTION_CREATE',
  PAID_SERVICE_SUBSCRIBE = 'PAID_SERVICE_SUBSCRIBE',
  SERVICE_DELETE = 'SERVICE_DELETE',
  CUSTOM = 'CUSTOM',
}

export interface ApprovalRequest {
  id: string;
  operationType: OperationType;
  agentId: string;
  agentName: string;
  operationId: string;
  reason: string;
  context: Record<string, unknown>;
  status: ApprovalStatus;
  requestedAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  requiresMultipleApprovals: boolean;
  approvalsRequired: number;
  approvalsReceived: number;
  approvers: ApprovalRecord[];
}

export interface ApprovalRecord {
  approver: string;
  status: 'APPROVED' | 'REJECTED' | 'PENDING';
  timestamp?: Date;
  notes?: string;
}

export class HumanApprovalSystem extends EventEmitter {
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private approvalTimers: Map<string, NodeJS.Timeout> = new Map();
  private defaultTimeoutMs: number = 24 * 60 * 60 * 1000; // 24 hours
  private criticalTimeoutMs: number = 1 * 60 * 60 * 1000; // 1 hour
  private lowPriorityTimeoutMs: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    super();
  }

  /**
   * Create an approval request for a critical operation
   * Returns immediately with PENDING status
   * Approval must be explicitly granted before operation can proceed
   */
  requestApproval(
    operationType: OperationType,
    agentId: string,
    agentName: string,
    operationId: string,
    reason: string,
    context: Record<string, unknown> = {},
    options?: {
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      requiresMultipleApprovals?: boolean;
      approvalsRequired?: number;
      requiredApprovers?: string[];
      customTimeout?: number;
    }
  ): ApprovalRequest {
    const priority = options?.priority || 'MEDIUM';
    const requiresMultiple = options?.requiresMultipleApprovals || false;
    const approvalsRequired = options?.approvalsRequired || (requiresMultiple ? 2 : 1);
    const timeoutMs = options?.customTimeout || this.getTimeoutForPriority(priority);
    const expiresAt = new Date(Date.now() + timeoutMs);

    const request: ApprovalRequest = {
      id: this.generateApprovalId(),
      operationType,
      agentId,
      agentName,
      operationId,
      reason,
      context,
      status: ApprovalStatus.PENDING,
      requestedAt: new Date(),
      expiresAt,
      priority,
      requiresMultipleApprovals: requiresMultiple,
      approvalsRequired,
      approvalsReceived: 0,
      approvers: (options?.requiredApprovers || []).map((approver) => ({
        approver,
        status: 'PENDING',
      })),
    };

    this.approvalRequests.set(request.id, request);
    this.scheduleExpiry(request.id, timeoutMs);
    this.emit('approval-requested', request);

    return request;
  }

  /**
   * Get approval status of a request
   */
  getApprovalStatus(requestId: string): ApprovalStatus | undefined {
    const request = this.approvalRequests.get(requestId);
    return request?.status;
  }

  /**
   * Get full approval request details
   */
  getApprovalRequest(requestId: string): ApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * Approve a pending request
   * Fail-closed: must explicitly approve, cannot auto-proceed
   */
  approve(requestId: string, approver: string, notes?: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Cannot approve request with status: ${request.status}`);
    }

    // Check if this approver is required and update their approval record
    if (request.approvers.length > 0) {
      const approverRecord = request.approvers.find((a) => a.approver === approver);
      if (approverRecord) {
        approverRecord.status = 'APPROVED';
        approverRecord.timestamp = new Date();
        approverRecord.notes = notes;
        request.approvalsReceived += 1;
      }
    } else {
      request.approvalsReceived += 1;
    }

    // Check if all required approvals have been received
    if (request.approvalsReceived >= request.approvalsRequired) {
      request.status = ApprovalStatus.APPROVED;
      request.approvedAt = new Date();
      request.approvedBy = approver;
      request.approvalNotes = notes;
      this.clearExpiryTimer(requestId);
      this.emit('approval-granted', request);
    } else {
      this.emit('approval-partial', request);
    }

    return request;
  }

  /**
   * Reject a pending request
   */
  reject(requestId: string, rejectedBy: string, reason: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Cannot reject request with status: ${request.status}`);
    }

    request.status = ApprovalStatus.REJECTED;
    request.rejectedAt = new Date();
    request.rejectedBy = rejectedBy;
    request.rejectionReason = reason;
    this.clearExpiryTimer(requestId);
    this.emit('approval-rejected', request);

    return request;
  }

  /**
   * Cancel a pending approval request
   */
  cancel(requestId: string, reason: string): ApprovalRequest {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(`Cannot cancel request with status: ${request.status}`);
    }

    request.status = ApprovalStatus.CANCELLED;
    request.rejectionReason = reason;
    this.clearExpiryTimer(requestId);
    this.emit('approval-cancelled', request);

    return request;
  }

  /**
   * Enforce approval before operation proceeds
   * Fail-closed: must be APPROVED, else throws error
   */
  enforceApproval(requestId: string): void {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    // Only APPROVED status allows operation to proceed
    if (request.status !== ApprovalStatus.APPROVED) {
      let errorMessage = '';

      switch (request.status) {
        case ApprovalStatus.PENDING:
          errorMessage = `Operation pending approval (Request: ${requestId})`;
          break;
        case ApprovalStatus.REJECTED:
          errorMessage = `Operation rejected. Reason: ${request.rejectionReason || 'No reason provided'}`;
          break;
        case ApprovalStatus.EXPIRED:
          errorMessage = `Approval request expired. Please request new approval.`;
          break;
        case ApprovalStatus.CANCELLED:
          errorMessage = `Approval request was cancelled.`;
          break;
      }

      const error = new Error(errorMessage);
      (error as any).requestId = requestId;
      (error as any).status = request.status;
      throw error;
    }
  }

  /**
   * Get all pending approval requests
   */
  getPendingRequests(filter?: {
    agentId?: string;
    operationType?: OperationType;
    priority?: string;
  }): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];

    for (const request of this.approvalRequests.values()) {
      if (request.status !== ApprovalStatus.PENDING) {
        continue;
      }

      if (filter?.agentId && request.agentId !== filter.agentId) {
        continue;
      }

      if (filter?.operationType && request.operationType !== filter.operationType) {
        continue;
      }

      if (filter?.priority && request.priority !== filter.priority) {
        continue;
      }

      pending.push(request);
    }

    return pending;
  }

  /**
   * Get approval history
   */
  getApprovalHistory(filter?: {
    agentId?: string;
    operationType?: OperationType;
    status?: ApprovalStatus;
    since?: Date;
    limit?: number;
  }): ApprovalRequest[] {
    let requests = Array.from(this.approvalRequests.values());

    if (filter?.agentId) {
      requests = requests.filter((r) => r.agentId === filter.agentId);
    }

    if (filter?.operationType) {
      requests = requests.filter((r) => r.operationType === filter.operationType);
    }

    if (filter?.status) {
      requests = requests.filter((r) => r.status === filter.status);
    }

    if (filter?.since) {
      requests = requests.filter((r) => r.requestedAt >= filter.since!);
    }

    // Sort by date, newest first
    requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    if (filter?.limit) {
      requests = requests.slice(0, filter.limit);
    }

    return requests;
  }

  /**
   * Get approval metrics
   */
  getMetrics(): {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    expiredRequests: number;
    averageApprovalTime: number;
    rejectionRate: number;
  } {
    const requests = Array.from(this.approvalRequests.values());
    let approvalTimes: number[] = [];

    const approved = requests.filter((r) => r.status === ApprovalStatus.APPROVED);
    const rejected = requests.filter((r) => r.status === ApprovalStatus.REJECTED);
    const expired = requests.filter((r) => r.status === ApprovalStatus.EXPIRED);
    const pending = requests.filter((r) => r.status === ApprovalStatus.PENDING);

    for (const req of approved) {
      if (req.approvedAt && req.requestedAt) {
        approvalTimes.push(req.approvedAt.getTime() - req.requestedAt.getTime());
      }
    }

    const averageApprovalTime = approvalTimes.length > 0
      ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
      : 0;

    const completedRequests = approved.length + rejected.length + expired.length;
    const rejectionRate = completedRequests > 0 ? rejected.length / completedRequests : 0;

    return {
      totalRequests: requests.length,
      pendingRequests: pending.length,
      approvedRequests: approved.length,
      rejectedRequests: rejected.length,
      expiredRequests: expired.length,
      averageApprovalTime,
      rejectionRate,
    };
  }

  /**
   * Schedule automatic expiry for an approval request
   */
  private scheduleExpiry(requestId: string, timeoutMs: number): void {
    const timer = setTimeout(() => {
      const request = this.approvalRequests.get(requestId);
      if (request && request.status === ApprovalStatus.PENDING) {
        request.status = ApprovalStatus.EXPIRED;
        request.rejectionReason = 'Approval request expired - no decision made within timeout period';
        this.emit('approval-expired', request);
      }

      this.approvalTimers.delete(requestId);
    }, timeoutMs);

    this.approvalTimers.set(requestId, timer);
  }

  /**
   * Clear expiry timer for a request
   */
  private clearExpiryTimer(requestId: string): void {
    const timer = this.approvalTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.approvalTimers.delete(requestId);
    }
  }

  /**
   * Get timeout duration based on priority
   */
  private getTimeoutForPriority(priority: string): number {
    switch (priority) {
      case 'HIGH':
        return this.criticalTimeoutMs;
      case 'MEDIUM':
        return this.defaultTimeoutMs;
      case 'LOW':
        return this.lowPriorityTimeoutMs;
      default:
        return this.defaultTimeoutMs;
    }
  }

  /**
   * Generate unique approval request ID
   */
  private generateApprovalId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set custom timeout durations
   */
  setTimeouts(config: {
    default?: number;
    critical?: number;
    lowPriority?: number;
  }): void {
    if (config.default !== undefined) {
      this.defaultTimeoutMs = config.default;
    }
    if (config.critical !== undefined) {
      this.criticalTimeoutMs = config.critical;
    }
    if (config.lowPriority !== undefined) {
      this.lowPriorityTimeoutMs = config.lowPriority;
    }
  }

  /**
   * Clean up expired requests (remove from memory)
   */
  cleanup(): void {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [id, request] of this.approvalRequests) {
      const ageMs = now.getTime() - request.requestedAt.getTime();
      const is90DaysOld = ageMs > 90 * 24 * 60 * 60 * 1000;

      if (is90DaysOld && request.status !== ApprovalStatus.PENDING) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.approvalRequests.delete(id);
      this.clearExpiryTimer(id);
    }
  }
}

export default HumanApprovalSystem;
