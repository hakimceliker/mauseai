/**
 * Approval Audit System - Immutable Approval Records & Audit Trail
 *
 * Maintains immutable audit trail of all approvals
 * Supports compliance reporting and forensics
 */

import crypto from 'crypto';

export enum AuditEventType {
  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_APPROVED = 'APPROVAL_APPROVED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  APPROVAL_CANCELLED = 'APPROVAL_CANCELLED',
  APPROVAL_SUPERSEDED = 'APPROVAL_SUPERSEDED',
}

export interface ApprovalAuditEntry {
  id: string;
  requestId: string;
  eventType: AuditEventType;
  timestamp: Date;
  actor: string;
  operationType: string;
  operationId: string;
  agentId: string;
  details: Record<string, unknown>;
  hash: string;
  previousHash: string;
  signature?: string;
}

export interface ApprovalAuditReport {
  operationId: string;
  operationType: string;
  timeline: ApprovalAuditEntry[];
  summary: {
    totalApprovals: number;
    totalRejections: number;
    totalTimeouts: number;
    averageApprovalTime: number;
    finalStatus: string;
  };
  complianceStatus: {
    isAuditComplete: boolean;
    hasValidChain: boolean;
    allEntriesSigned: boolean;
    violations: string[];
  };
}

export class ApprovalAuditSystem {
  private auditLog: ApprovalAuditEntry[] = [];
  private requestIndex: Map<string, ApprovalAuditEntry[]> = new Map();
  private operationIndex: Map<string, ApprovalAuditEntry[]> = new Map();

  /**
   * Record an approval event
   * Creates immutable, chained audit entry
   */
  recordEvent(
    requestId: string,
    eventType: AuditEventType,
    actor: string,
    operationType: string,
    operationId: string,
    agentId: string,
    details: Record<string, unknown> = {}
  ): ApprovalAuditEntry {
    const previousEntry = this.auditLog[this.auditLog.length - 1];
    const previousHash = previousEntry ? previousEntry.hash : 'genesis';

    const entry: ApprovalAuditEntry = {
      id: this.generateEntryId(),
      requestId,
      eventType,
      timestamp: new Date(),
      actor,
      operationType,
      operationId,
      agentId,
      details,
      hash: '',
      previousHash,
    };

    // Calculate hash for immutability
    entry.hash = this.calculateHash(entry);

    // Add to audit log
    this.auditLog.push(entry);

    // Update indices for quick lookup
    if (!this.requestIndex.has(requestId)) {
      this.requestIndex.set(requestId, []);
    }
    this.requestIndex.get(requestId)!.push(entry);

    if (!this.operationIndex.has(operationId)) {
      this.operationIndex.set(operationId, []);
    }
    this.operationIndex.get(operationId)!.push(entry);

    return entry;
  }

  /**
   * Get audit trail for a specific approval request
   */
  getRequestAudit(requestId: string): ApprovalAuditEntry[] {
    return (this.requestIndex.get(requestId) || []).slice();
  }

  /**
   * Get audit trail for a specific operation
   */
  getOperationAudit(operationId: string): ApprovalAuditEntry[] {
    return (this.operationIndex.get(operationId) || []).slice();
  }

  /**
   * Generate compliance report for an operation
   */
  generateComplianceReport(operationId: string): ApprovalAuditReport {
    const entries = this.getOperationAudit(operationId);

    if (entries.length === 0) {
      throw new Error(`No audit entries found for operation: ${operationId}`);
    }

    const firstEntry = entries[0];
    const approvals = entries.filter((e) => e.eventType === AuditEventType.APPROVAL_APPROVED);
    const rejections = entries.filter((e) => e.eventType === AuditEventType.APPROVAL_REJECTED);
    const expirations = entries.filter((e) => e.eventType === AuditEventType.APPROVAL_EXPIRED);

    // Calculate average approval time
    const approvalTimes: number[] = [];
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].eventType === AuditEventType.APPROVAL_APPROVED) {
        const time = entries[i].timestamp.getTime() - entries[i - 1].timestamp.getTime();
        approvalTimes.push(time);
      }
    }
    const averageTime = approvalTimes.length > 0
      ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
      : 0;

    // Verify chain integrity
    const chainValid = this.verifyChainIntegrity(entries);
    const violations: string[] = [];

    if (!chainValid) {
      violations.push('CHAIN_INTEGRITY_VIOLATION');
    }

    // Determine final status
    const lastEntry = entries[entries.length - 1];
    let finalStatus = 'PENDING';
    if (lastEntry.eventType === AuditEventType.APPROVAL_APPROVED) {
      finalStatus = 'APPROVED';
    } else if (lastEntry.eventType === AuditEventType.APPROVAL_REJECTED) {
      finalStatus = 'REJECTED';
    } else if (lastEntry.eventType === AuditEventType.APPROVAL_EXPIRED) {
      finalStatus = 'EXPIRED';
    } else if (lastEntry.eventType === AuditEventType.APPROVAL_CANCELLED) {
      finalStatus = 'CANCELLED';
    }

    return {
      operationId,
      operationType: firstEntry.operationType,
      timeline: entries,
      summary: {
        totalApprovals: approvals.length,
        totalRejections: rejections.length,
        totalTimeouts: expirations.length,
        averageApprovalTime: averageTime,
        finalStatus,
      },
      complianceStatus: {
        isAuditComplete: true,
        hasValidChain: chainValid,
        allEntriesSigned: entries.every((e) => !!e.signature),
        violations,
      },
    };
  }

  /**
   * Query audit log with filters
   */
  query(filter: {
    eventType?: AuditEventType;
    actor?: string;
    operationType?: string;
    agentId?: string;
    since?: Date;
    until?: Date;
    limit?: number;
  }): ApprovalAuditEntry[] {
    let results = [...this.auditLog];

    if (filter.eventType) {
      results = results.filter((e) => e.eventType === filter.eventType);
    }

    if (filter.actor) {
      results = results.filter((e) => e.actor === filter.actor);
    }

    if (filter.operationType) {
      results = results.filter((e) => e.operationType === filter.operationType);
    }

    if (filter.agentId) {
      results = results.filter((e) => e.agentId === filter.agentId);
    }

    if (filter.since) {
      results = results.filter((e) => e.timestamp >= filter.since!);
    }

    if (filter.until) {
      results = results.filter((e) => e.timestamp <= filter.until!);
    }

    // Sort by timestamp, newest first
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Verify chain integrity (hash-based verification)
   */
  verifyChainIntegrity(entries: ApprovalAuditEntry[]): boolean {
    if (entries.length === 0) {
      return true;
    }

    // Verify first entry has genesis previous hash
    if (entries[0].previousHash !== 'genesis') {
      return false;
    }

    // Verify hash chain
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedHash = this.calculateHash(entry);

      if (entry.hash !== expectedHash) {
        return false;
      }

      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate hash for an audit entry
   */
  private calculateHash(entry: Partial<ApprovalAuditEntry>): string {
    const content = JSON.stringify({
      requestId: entry.requestId,
      eventType: entry.eventType,
      timestamp: entry.timestamp,
      actor: entry.actor,
      operationType: entry.operationType,
      operationId: entry.operationId,
      agentId: entry.agentId,
      details: entry.details,
      previousHash: entry.previousHash,
    });

    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sign an audit entry (optional digital signature)
   */
  signEntry(entryId: string, privateKey: string): void {
    const entry = this.auditLog.find((e) => e.id === entryId);
    if (!entry) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    // Sign the hash
    const signature = crypto.createSign('sha256');
    signature.update(entry.hash);
    entry.signature = signature.sign(privateKey, 'hex');
  }

  /**
   * Verify entry signature
   */
  verifyEntrySignature(entry: ApprovalAuditEntry, publicKey: string): boolean {
    if (!entry.signature) {
      return false;
    }

    const verify = crypto.createVerify('sha256');
    verify.update(entry.hash);
    return verify.verify(publicKey, entry.signature, 'hex');
  }

  /**
   * Export audit log as immutable archive
   */
  exportAsArchive(): string {
    const archive = {
      exportedAt: new Date(),
      entries: this.auditLog.map((e) => ({
        id: e.id,
        requestId: e.requestId,
        eventType: e.eventType,
        timestamp: e.timestamp,
        actor: e.actor,
        operationType: e.operationType,
        operationId: e.operationId,
        agentId: e.agentId,
        details: e.details,
        hash: e.hash,
        previousHash: e.previousHash,
        signature: e.signature,
      })),
    };

    return JSON.stringify(archive, null, 2);
  }

  /**
   * Get statistics about approval patterns
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByActor: Record<string, number>;
    eventsByOperationType: Record<string, number>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByActor: Record<string, number> = {};
    const eventsByOperationType: Record<string, number> = {};

    for (const entry of this.auditLog) {
      eventsByType[entry.eventType] = (eventsByType[entry.eventType] || 0) + 1;
      eventsByActor[entry.actor] = (eventsByActor[entry.actor] || 0) + 1;
      eventsByOperationType[entry.operationType] = (eventsByOperationType[entry.operationType] || 0) + 1;
    }

    const timestamps = this.auditLog.map((e) => e.timestamp.getTime());
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      totalEvents: this.auditLog.length,
      eventsByType,
      eventsByActor,
      eventsByOperationType,
      oldestEvent: oldestTimestamp ? new Date(oldestTimestamp) : null,
      newestEvent: newestTimestamp ? new Date(newestTimestamp) : null,
    };
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all audit entries (dangerous - use with caution)
   */
  getAllEntries(): ApprovalAuditEntry[] {
    return this.auditLog.slice();
  }
}

export default ApprovalAuditSystem;
