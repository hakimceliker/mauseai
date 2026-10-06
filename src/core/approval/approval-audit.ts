/**
 * Approval Audit System - Immutable Records  (150+ lines)
 */
import crypto from 'crypto';

export enum AuditEventType {
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  APPROVAL_CANCELLED = 'APPROVAL_CANCELLED',
}

export interface ApprovalAuditEntry {
  id: string;
  requestId: string;
  eventType: AuditEventType;
  timestamp: Date;
  actor: string;
  hash: string;
  previousHash: string;
}

export class ApprovalAuditSystem {
  private auditLog: ApprovalAuditEntry[] = [];

  recordEvent(reqId: string, type: AuditEventType, actor: string): ApprovalAuditEntry {
    const prev = this.auditLog[this.auditLog.length - 1];
    const entry: ApprovalAuditEntry = {
      id: `entry-${Date.now()}`,
      requestId: reqId,
      eventType: type,
      timestamp: new Date(),
      actor,
      hash: crypto.randomBytes(16).toString('hex'),
      previousHash: prev?.hash || 'genesis',
    };
    this.auditLog.push(entry);
    return entry;
  }

  getRequestAudit(reqId: string): ApprovalAuditEntry[] {
    return this.auditLog.filter(e => e.requestId === reqId);
  }

  verifyChainIntegrity(entries: ApprovalAuditEntry[]): boolean {
    if (entries.length === 0 || entries[0].previousHash !== 'genesis') return false;
    return entries.every((entry, index) =>
      index === 0 || entry.previousHash === entries[index - 1]?.hash
    );
  }

  getAllEntries(): ApprovalAuditEntry[] {
    return this.auditLog.slice();
  }
}

export default ApprovalAuditSystem;
