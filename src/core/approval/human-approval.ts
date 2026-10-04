/**
 * Human Approval System - Critical Operations (fail-closed)  (300+ lines)
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
  PRODUCTION_DATA_DELETE = 'PRODUCTION_DATA_DELETE',
  SECRET_CREATE = 'SECRET_CREATE',
  DNS_CHANGE = 'DNS_CHANGE',
  FORCE_PUSH = 'FORCE_PUSH',
  INFRASTRUCTURE_CHANGE = 'INFRASTRUCTURE_CHANGE',
  CUSTOM = 'CUSTOM',
}

export interface ApprovalRequest {
  id: string;
  operationType: OperationType;
  agentId: string;
  status: ApprovalStatus;
  requestedAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export class HumanApprovalSystem extends EventEmitter {
  private requests: Map<string, ApprovalRequest> = new Map();
  private defaultTimeout = 24 * 60 * 60 * 1000;

  requestApproval(type: OperationType, agentId: string, name: string, opId: string, reason: string): ApprovalRequest {
    const req: ApprovalRequest = {
      id: `approval-${Date.now()}`,
      operationType: type,
      agentId,
      status: ApprovalStatus.PENDING,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + this.defaultTimeout),
    };
    this.requests.set(req.id, req);
    this.emit('approval-requested', req);
    return req;
  }

  approve(reqId: string, approver: string, notes?: string): ApprovalRequest {
    const req = this.requests.get(reqId);
    if (!req) throw new Error('Request not found');
    req.status = ApprovalStatus.APPROVED;
    req.approvedBy = approver;
    req.approvedAt = new Date();
    this.emit('approval-granted', req);
    return req;
  }

  reject(reqId: string, by: string, reason: string): ApprovalRequest {
    const req = this.requests.get(reqId);
    if (!req) throw new Error('Request not found');
    req.status = ApprovalStatus.REJECTED;
    this.emit('approval-rejected', req);
    return req;
  }

  enforceApproval(reqId: string): void {
    const req = this.requests.get(reqId);
    if (!req || req.status !== ApprovalStatus.APPROVED) {
      throw new Error('Operation not approved');
    }
  }

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === ApprovalStatus.PENDING);
  }

  getApprovalRequest(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }
}

export default HumanApprovalSystem;
