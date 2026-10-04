/**
 * Permission Engine - Tool Access Control
 *
 * Enforces fail-closed permission model where:
 * - Default: DENY all access
 * - Requires explicit allowlist entry
 * - Validates against allowed scopes and contexts
 * - Audits all permission checks
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
  allowedScopes?: string[];
  restrictedPatterns?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

export interface AgentPermissions {
  agentId: string;
  agentName: string;
  permissionLevel: PermissionLevel;
  allowedTools: Map<string, ToolPermission>;
  restrictions: PermissionRestriction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionRestriction {
  id: string;
  type: 'PATTERN' | 'SCOPE' | 'TIME_WINDOW' | 'RATE_LIMIT';
  value: string;
  reason: string;
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
  approvalId?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  auditLogId: string;
}

export interface PermissionAuditLog {
  id: string;
  timestamp: Date;
  agentId: string;
  toolId: string;
  operation: string;
  allowed: boolean;
  reason: string;
  denialReason?: string;
  context?: Record<string, unknown>;
}

export class PermissionEngine extends EventEmitter {
  private agentPermissions: Map<string, AgentPermissions> = new Map();
  private toolRegistry: Map<string, ToolPermission> = new Map();
  private auditLogs: PermissionAuditLog[] = [];
  private permissionCache: Map<string, PermissionCheckResult> = new Map();

  constructor() {
    super();
    this.initializeToolRegistry();
  }

  /**
   * Initialize default tool registry with critical tools
   */
  private initializeToolRegistry(): void {
    // File System Tools
    this.registerTool({
      toolId: 'fs_read',
      toolName: 'File System Read',
      category: ToolCategory.FILE_SYSTEM,
      requiredLevel: PermissionLevel.READ,
      requiresApproval: false,
      riskLevel: 'LOW',
      description: 'Read files from file system',
    });

    this.registerTool({
      toolId: 'fs_write',
      toolName: 'File System Write',
      category: ToolCategory.FILE_SYSTEM,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: false,
      riskLevel: 'MEDIUM',
      description: 'Write files to file system',
    });

    this.registerTool({
      toolId: 'fs_delete',
      toolName: 'File System Delete',
      category: ToolCategory.FILE_SYSTEM,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: true,
      riskLevel: 'HIGH',
      description: 'Delete files from file system',
    });

    // Git Tools
    this.registerTool({
      toolId: 'git_commit',
      toolName: 'Git Commit',
      category: ToolCategory.GIT,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: false,
      riskLevel: 'MEDIUM',
      description: 'Create git commits',
    });

    this.registerTool({
      toolId: 'git_push',
      toolName: 'Git Push',
      category: ToolCategory.GIT,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: false,
      riskLevel: 'MEDIUM',
      description: 'Push commits to remote repository',
    });

    this.registerTool({
      toolId: 'git_force_push',
      toolName: 'Git Force Push',
      category: ToolCategory.GIT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Force push to remote repository',
    });

    this.registerTool({
      toolId: 'git_delete_branch',
      toolName: 'Git Delete Branch',
      category: ToolCategory.GIT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Delete git branches',
    });

    // Deployment Tools
    this.registerTool({
      toolId: 'deploy_prod',
      toolName: 'Production Deployment',
      category: ToolCategory.DEPLOYMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Deploy to production environment',
    });

    this.registerTool({
      toolId: 'deploy_staging',
      toolName: 'Staging Deployment',
      category: ToolCategory.DEPLOYMENT,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: false,
      riskLevel: 'MEDIUM',
      description: 'Deploy to staging environment',
    });

    // Database Tools
    this.registerTool({
      toolId: 'db_read',
      toolName: 'Database Read',
      category: ToolCategory.DATABASE,
      requiredLevel: PermissionLevel.READ,
      requiresApproval: false,
      riskLevel: 'LOW',
      description: 'Read from database',
    });

    this.registerTool({
      toolId: 'db_write',
      toolName: 'Database Write',
      category: ToolCategory.DATABASE,
      requiredLevel: PermissionLevel.WRITE,
      requiresApproval: false,
      riskLevel: 'MEDIUM',
      description: 'Write to database',
    });

    this.registerTool({
      toolId: 'db_delete_prod',
      toolName: 'Production Database Delete',
      category: ToolCategory.DATABASE,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Delete data from production database',
    });

    this.registerTool({
      toolId: 'db_schema_change',
      toolName: 'Production Database Schema Change',
      category: ToolCategory.DATABASE,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Modify production database schema',
    });

    // Secret Management Tools
    this.registerTool({
      toolId: 'secret_create',
      toolName: 'Create Secret',
      category: ToolCategory.SECRET_MANAGEMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Create new secrets or credentials',
    });

    this.registerTool({
      toolId: 'secret_read',
      toolName: 'Read Secret',
      category: ToolCategory.SECRET_MANAGEMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: false,
      riskLevel: 'HIGH',
      description: 'Read secrets or credentials',
    });

    this.registerTool({
      toolId: 'secret_modify',
      toolName: 'Modify Secret',
      category: ToolCategory.SECRET_MANAGEMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Modify existing secrets or credentials',
    });

    // Network Tools
    this.registerTool({
      toolId: 'dns_change',
      toolName: 'DNS Change',
      category: ToolCategory.NETWORK,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Modify DNS records',
    });

    // Infrastructure Tools
    this.registerTool({
      toolId: 'infra_provision',
      toolName: 'Infrastructure Provisioning',
      category: ToolCategory.INFRASTRUCTURE,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Provision infrastructure resources',
    });

    this.registerTool({
      toolId: 'infra_delete',
      toolName: 'Infrastructure Deletion',
      category: ToolCategory.INFRASTRUCTURE,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Delete infrastructure resources',
    });

    // Payment Tools
    this.registerTool({
      toolId: 'payment_process',
      toolName: 'Process Payment',
      category: ToolCategory.PAYMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Process financial transactions',
    });

    this.registerTool({
      toolId: 'subscription_create',
      toolName: 'Create Subscription',
      category: ToolCategory.PAYMENT,
      requiredLevel: PermissionLevel.ADMIN,
      requiresApproval: true,
      riskLevel: 'CRITICAL',
      description: 'Create paid service subscriptions',
    });
  }

  /**
   * Register a tool in the permission system
   */
  registerTool(permission: ToolPermission): void {
    this.toolRegistry.set(permission.toolId, permission);
    this.emit('tool-registered', permission);
  }

  /**
   * Register an agent and set its permissions
   */
  registerAgent(agentId: string, agentName: string, level: PermissionLevel, allowedToolIds: string[]): void {
    const allowedTools = new Map<string, ToolPermission>();

    for (const toolId of allowedToolIds) {
      const tool = this.toolRegistry.get(toolId);
      if (tool) {
        allowedTools.set(toolId, tool);
      }
    }

    const agentPerms: AgentPermissions = {
      agentId,
      agentName,
      permissionLevel: level,
      allowedTools,
      restrictions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.agentPermissions.set(agentId, agentPerms);
    this.emit('agent-registered', agentPerms);
  }

  /**
   * Check if an agent has permission to use a tool
   * Implements fail-closed principle: default DENY
   */
  checkPermission(request: PermissionCheckRequest): PermissionCheckResult {
    const auditLogId = this.generateAuditLogId();
    const cacheKey = `${request.agentId}:${request.toolId}:${request.operation}`;

    // Check cache (optional optimization)
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Step 1: Verify agent exists
    const agent = this.agentPermissions.get(request.agentId);
    if (!agent) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'AGENT_NOT_FOUND',
        requiresApproval: false,
        riskLevel: 'CRITICAL',
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 2: Verify tool exists
    const tool = this.toolRegistry.get(request.toolId);
    if (!tool) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'TOOL_NOT_FOUND',
        requiresApproval: false,
        riskLevel: 'CRITICAL',
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 3: Check if agent has the tool in allowlist
    if (!agent.allowedTools.has(request.toolId)) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'TOOL_NOT_IN_ALLOWLIST',
        requiresApproval: false,
        riskLevel: tool.riskLevel,
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 4: Check permission level
    if (!this.hasRequiredPermissionLevel(agent.permissionLevel, tool.requiredLevel)) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSION_LEVEL',
        requiresApproval: false,
        riskLevel: tool.riskLevel,
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 5: Check scope restrictions
    if (!this.passScopeChecks(tool, request)) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'SCOPE_RESTRICTION_VIOLATED',
        requiresApproval: false,
        riskLevel: tool.riskLevel,
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 6: Check agent restrictions
    if (!this.passesAgentRestrictions(agent, request)) {
      const result: PermissionCheckResult = {
        allowed: false,
        reason: 'AGENT_RESTRICTION_VIOLATED',
        requiresApproval: false,
        riskLevel: tool.riskLevel,
        auditLogId,
      };
      this.logPermissionCheck(request, result);
      return result;
    }

    // Step 7: Determine if approval is required
    const requiresApproval = tool.requiresApproval || this.isHighRiskOperation(tool);

    // All checks passed
    const result: PermissionCheckResult = {
      allowed: true,
      reason: 'PERMISSION_GRANTED',
      requiresApproval,
      riskLevel: tool.riskLevel,
      auditLogId,
    };

    this.logPermissionCheck(request, result);
    this.permissionCache.set(cacheKey, result);

    return result;
  }

  /**
   * Check if permission level meets requirements
   */
  private hasRequiredPermissionLevel(agentLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
    const levelHierarchy: Record<PermissionLevel, number> = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.WRITE]: 2,
      [PermissionLevel.ADMIN]: 3,
    };

    return levelHierarchy[agentLevel] >= levelHierarchy[requiredLevel];
  }

  /**
   * Check if tool scopes are satisfied
   */
  private passScopeChecks(tool: ToolPermission, request: PermissionCheckRequest): boolean {
    if (!tool.allowedScopes || tool.allowedScopes.length === 0) {
      return true;
    }

    const targetResource = request.targetResource || '';
    return tool.allowedScopes.some((scope) => this.matchesScope(targetResource, scope));
  }

  /**
   * Match resource against scope pattern
   */
  private matchesScope(resource: string, scope: string): boolean {
    if (scope === '*') return true;
    if (scope === resource) return true;

    // Support wildcard patterns
    const pattern = scope.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(resource);
  }

  /**
   * Check agent-specific restrictions
   */
  private passesAgentRestrictions(agent: AgentPermissions, request: PermissionCheckRequest): boolean {
    for (const restriction of agent.restrictions) {
      if (restriction.type === 'PATTERN') {
        const pattern = new RegExp(restriction.value);
        if (pattern.test(request.operation)) {
          return false;
        }
      }

      if (restriction.type === 'SCOPE') {
        if (request.targetResource && request.targetResource.includes(restriction.value)) {
          return false;
        }
      }

      if (restriction.type === 'TIME_WINDOW') {
        const now = new Date();
        const [start, end] = restriction.value.split('-');
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);

        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (currentTime < startTime || currentTime > endTime) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Determine if operation is high-risk and needs approval
   */
  private isHighRiskOperation(tool: ToolPermission): boolean {
    return tool.riskLevel === 'CRITICAL' || tool.riskLevel === 'HIGH';
  }

  /**
   * Log permission check to audit trail
   */
  private logPermissionCheck(request: PermissionCheckRequest, result: PermissionCheckResult): void {
    const log: PermissionAuditLog = {
      id: result.auditLogId,
      timestamp: request.timestamp,
      agentId: request.agentId,
      toolId: request.toolId,
      operation: request.operation,
      allowed: result.allowed,
      reason: result.reason,
      context: request.context,
    };

    this.auditLogs.push(log);
    this.emit('permission-checked', log);
  }

  /**
   * Get audit logs with optional filtering
   */
  getAuditLogs(filter?: {
    agentId?: string;
    toolId?: string;
    allowedOnly?: boolean;
    deniedOnly?: boolean;
    since?: Date;
  }): PermissionAuditLog[] {
    let logs = [...this.auditLogs];

    if (filter?.agentId) {
      logs = logs.filter((l) => l.agentId === filter.agentId);
    }

    if (filter?.toolId) {
      logs = logs.filter((l) => l.toolId === filter.toolId);
    }

    if (filter?.allowedOnly) {
      logs = logs.filter((l) => l.allowed);
    }

    if (filter?.deniedOnly) {
      logs = logs.filter((l) => !l.allowed);
    }

    if (filter?.since) {
      logs = logs.filter((l) => l.timestamp >= filter.since!);
    }

    return logs;
  }

  /**
   * Clear cache (for testing or after permission updates)
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Get tool information
   */
  getTool(toolId: string): ToolPermission | undefined {
    return this.toolRegistry.get(toolId);
  }

  /**
   * Get agent permissions
   */
  getAgentPermissions(agentId: string): AgentPermissions | undefined {
    return this.agentPermissions.get(agentId);
  }

  /**
   * Generate unique audit log ID
   */
  private generateAuditLogId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add restriction to agent
   */
  addAgentRestriction(agentId: string, restriction: PermissionRestriction): void {
    const agent = this.agentPermissions.get(agentId);
    if (agent) {
      agent.restrictions.push(restriction);
      agent.updatedAt = new Date();
      this.clearCache();
    }
  }

  /**
   * Remove restriction from agent
   */
  removeAgentRestriction(agentId: string, restrictionId: string): void {
    const agent = this.agentPermissions.get(agentId);
    if (agent) {
      agent.restrictions = agent.restrictions.filter((r) => r.id !== restrictionId);
      agent.updatedAt = new Date();
      this.clearCache();
    }
  }
}

export default PermissionEngine;
