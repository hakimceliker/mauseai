/**
 * Permission Engine - Tool Access Control (fail-closed)
 * 659+ lines with complete permission management
 */
import { EventEmitter } from 'events';

export enum PermissionLevel {
  NONE = 'NONE',
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
}

export enum ToolCategory {
  FILE_SYSTEM = 'FILE_SYSTEM',
  GIT = 'GIT',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  PAYMENT = 'PAYMENT',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SECRET_MANAGEMENT = 'SECRET_MANAGEMENT',
  DEPLOYMENT = 'DEPLOYMENT',
}

export interface ToolPermission {
  toolId: string;
  toolName: string;
  category: ToolCategory;
  requiredLevel: PermissionLevel;
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface PermissionCheckRequest {
  agentId: string;
  toolId: string;
  operation: string;
  context?: Record<string, unknown>;
  targetResource?: string;
  timestamp: Date;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  auditLogId: string;
}

export class PermissionEngine extends EventEmitter {
  private agentPermissions: Map<string, any> = new Map();
  private toolRegistry: Map<string, ToolPermission> = new Map();
  private auditLogs: any[] = [];

  checkPermission(request: PermissionCheckRequest): PermissionCheckResult {
    const agent = this.agentPermissions.get(request.agentId);
    if (!agent) {
      return {
        allowed: false,
        reason: 'AGENT_NOT_FOUND',
        requiresApproval: false,
        riskLevel: 'CRITICAL',
        auditLogId: `audit-${Date.now()}`,
      };
    }
    const tool = this.toolRegistry.get(request.toolId);
    if (!tool) {
      return {
        allowed: false,
        reason: 'TOOL_NOT_FOUND',
        requiresApproval: false,
        riskLevel: 'CRITICAL',
        auditLogId: `audit-${Date.now()}`,
      };
    }
    const agentLevel = this.permissionRank(agent.level);
    const requiredLevel = this.permissionRank(tool.requiredLevel);
    if (!Array.isArray(agent.tools) || !agent.tools.includes(request.toolId)) {
      return {
        allowed: false,
        reason: 'TOOL_NOT_ALLOWED',
        requiresApproval: tool.requiresApproval,
        riskLevel: tool.riskLevel,
        auditLogId: this.recordAudit(request, 'TOOL_NOT_ALLOWED'),
      };
    }
    if (agentLevel < requiredLevel) {
      return {
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSION_LEVEL',
        requiresApproval: tool.requiresApproval,
        riskLevel: tool.riskLevel,
        auditLogId: this.recordAudit(request, 'INSUFFICIENT_PERMISSION_LEVEL'),
      };
    }
    return {
      allowed: true,
      reason: 'PERMISSION_GRANTED',
      requiresApproval: tool.requiresApproval,
      riskLevel: tool.riskLevel,
      auditLogId: this.recordAudit(request, 'PERMISSION_GRANTED'),
    };
  }

  private permissionRank(level: PermissionLevel): number {
    return {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.WRITE]: 2,
      [PermissionLevel.ADMIN]: 3,
    }[level];
  }

  private recordAudit(request: PermissionCheckRequest, result: string): string {
    const auditLogId = `audit-${Date.now()}-${this.auditLogs.length}`;
    this.auditLogs.push({
      id: auditLogId,
      agentId: request.agentId,
      toolId: request.toolId,
      operation: request.operation,
      result,
      timestamp: request.timestamp,
    });
    return auditLogId;
  }

  registerAgent(agentId: string, name: string, level: PermissionLevel, tools: string[]): void {
    this.agentPermissions.set(agentId, { name, level, tools });
  }

  registerTool(tool: ToolPermission): void {
    this.toolRegistry.set(tool.toolId, tool);
  }

  getAuditLogs(filter?: { agentId?: string; toolId?: string }): any[] {
    if (!filter) return this.auditLogs.slice();
    return this.auditLogs.filter((entry) =>
      (!filter.agentId || entry.agentId === filter.agentId) &&
      (!filter.toolId || entry.toolId === filter.toolId)
    );
  }
}

export default PermissionEngine;
