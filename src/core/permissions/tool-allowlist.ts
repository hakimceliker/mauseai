/**
 * Tool Allowlist - Per-Agent Tool Permissions
 *
 * Maintains explicit allowlists for each agent/role
 * Fail-closed: only explicitly listed tools are allowed
 */

import { PermissionLevel } from './permission-engine';

export interface ToolAllowlistEntry {
  toolId: string;
  agentId: string;
  allowedSince: Date;
  allowedBy: string; // User/admin who granted permission
  reason: string;
  expiresAt?: Date;
  scopes?: string[]; // Specific resources/scopes this agent can use the tool on
}

export interface AgentAllowlist {
  agentId: string;
  agentName: string;
  permissionLevel: PermissionLevel;
  tools: Map<string, ToolAllowlistEntry>;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class ToolAllowlist {
  private allowlists: Map<string, AgentAllowlist> = new Map();
  private auditTrail: ToolAllowlistAuditEntry[] = [];

  constructor() {
    this.initializeDefaultAllowlists();
  }

  /**
   * Initialize default allowlists for built-in agents
   */
  private initializeDefaultAllowlists(): void {
    // Admin Agent - Full access to all tools
    this.createAllowlist('admin-agent', 'Admin Agent', PermissionLevel.ADMIN);

    // Developer Agent - Standard development tools
    this.createAllowlist('dev-agent', 'Developer Agent', PermissionLevel.WRITE);
    this.grantToolAccess('dev-agent', 'fs_read', 'System', 'Standard file read access');
    this.grantToolAccess('dev-agent', 'fs_write', 'System', 'Standard file write access');
    this.grantToolAccess('dev-agent', 'git_commit', 'System', 'Create commits');
    this.grantToolAccess('dev-agent', 'git_push', 'System', 'Push to non-main branches');
    this.grantToolAccess('dev-agent', 'deploy_staging', 'System', 'Deploy to staging');

    // CI/CD Agent - Deployment and build tools
    this.createAllowlist('ci-agent', 'CI/CD Agent', PermissionLevel.ADMIN);
    this.grantToolAccess('ci-agent', 'fs_read', 'System', 'Read build artifacts');
    this.grantToolAccess('ci-agent', 'fs_write', 'System', 'Write build output');
    this.grantToolAccess('ci-agent', 'git_push', 'System', 'Push build metadata');
    this.grantToolAccess('ci-agent', 'deploy_prod', 'System', 'Production deployment');
    this.grantToolAccess('ci-agent', 'deploy_staging', 'System', 'Staging deployment');

    // Database Agent - Database-specific operations
    this.createAllowlist('db-agent', 'Database Agent', PermissionLevel.WRITE);
    this.grantToolAccess('db-agent', 'db_read', 'System', 'Read from database');
    this.grantToolAccess('db-agent', 'db_write', 'System', 'Write to database');
    this.grantToolAccess('db-agent', 'db_schema_change', 'System', 'Schema migrations');

    // Read-Only Agent - Observation and monitoring
    this.createAllowlist('observer-agent', 'Observer Agent', PermissionLevel.READ);
    this.grantToolAccess('observer-agent', 'fs_read', 'System', 'Read files for analysis');
    this.grantToolAccess('observer-agent', 'db_read', 'System', 'Read database for monitoring');
  }

  /**
   * Create a new agent allowlist
   */
  createAllowlist(agentId: string, agentName: string, permissionLevel: PermissionLevel): AgentAllowlist {
    const allowlist: AgentAllowlist = {
      agentId,
      agentName,
      permissionLevel,
      tools: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.allowlists.set(agentId, allowlist);

    this.recordAudit({
      action: 'ALLOWLIST_CREATED',
      agentId,
      toolId: '',
      grantedBy: 'System',
      timestamp: new Date(),
      details: `Created allowlist for ${agentName}`,
    });

    return allowlist;
  }

  /**
   * Grant tool access to an agent
   */
  grantToolAccess(
    agentId: string,
    toolId: string,
    grantedBy: string,
    reason: string,
    scopes?: string[],
    expiresAt?: Date
  ): ToolAllowlistEntry {
    const allowlist = this.allowlists.get(agentId);
    if (!allowlist) {
      throw new Error(`Allowlist not found for agent: ${agentId}`);
    }

    const entry: ToolAllowlistEntry = {
      toolId,
      agentId,
      allowedSince: new Date(),
      allowedBy: grantedBy,
      reason,
      expiresAt,
      scopes,
    };

    allowlist.tools.set(toolId, entry);
    allowlist.updatedAt = new Date();

    this.recordAudit({
      action: 'TOOL_ACCESS_GRANTED',
      agentId,
      toolId,
      grantedBy,
      timestamp: new Date(),
      details: `Granted access to ${toolId}: ${reason}`,
      scopes,
      expiresAt,
    });

    return entry;
  }

  /**
   * Revoke tool access from an agent
   */
  revokeToolAccess(agentId: string, toolId: string, revokedBy: string, reason: string): void {
    const allowlist = this.allowlists.get(agentId);
    if (!allowlist) {
      throw new Error(`Allowlist not found for agent: ${agentId}`);
    }

    const entry = allowlist.tools.get(toolId);
    if (entry) {
      allowlist.tools.delete(toolId);
      allowlist.updatedAt = new Date();

      this.recordAudit({
        action: 'TOOL_ACCESS_REVOKED',
        agentId,
        toolId,
        grantedBy: revokedBy,
        timestamp: new Date(),
        details: `Revoked access to ${toolId}: ${reason}`,
      });
    }
  }

  /**
   * Check if tool is in allowlist for agent
   */
  isToolAllowed(agentId: string, toolId: string): boolean {
    const allowlist = this.allowlists.get(agentId);
    if (!allowlist || !allowlist.isActive) {
      return false;
    }

    const entry = allowlist.tools.get(toolId);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Check if tool access is allowed for specific scope/resource
   */
  isToolAllowedForScope(agentId: string, toolId: string, resource: string): boolean {
    if (!this.isToolAllowed(agentId, toolId)) {
      return false;
    }

    const allowlist = this.allowlists.get(agentId);
    const entry = allowlist?.tools.get(toolId);

    if (!entry) {
      return false;
    }

    // If no scopes specified, all resources allowed
    if (!entry.scopes || entry.scopes.length === 0) {
      return true;
    }

    // Check if resource matches any allowed scope
    return entry.scopes.some((scope) => this.matchesScope(resource, scope));
  }

  /**
   * Match resource against scope pattern (supports wildcards)
   */
  private matchesScope(resource: string, scope: string): boolean {
    if (scope === '*') return true;
    if (scope === resource) return true;

    // Support wildcard patterns
    const pattern = scope.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(resource);
  }

  /**
   * Get allowlist for agent
   */
  getAllowlist(agentId: string): AgentAllowlist | undefined {
    return this.allowlists.get(agentId);
  }

  /**
   * Get all allowed tools for agent
   */
  getAllowedTools(agentId: string): string[] {
    const allowlist = this.allowlists.get(agentId);
    if (!allowlist || !allowlist.isActive) {
      return [];
    }

    const now = new Date();
    const allowed: string[] = [];

    for (const [toolId, entry] of allowlist.tools) {
      if (!entry.expiresAt || entry.expiresAt > now) {
        allowed.push(toolId);
      }
    }

    return allowed;
  }

  /**
   * Get all agents with access to a specific tool
   */
  getAgentsWithToolAccess(toolId: string): string[] {
    const agents: string[] = [];

    for (const [agentId, allowlist] of this.allowlists) {
      if (allowlist.isActive && allowlist.tools.has(toolId)) {
        agents.push(agentId);
      }
    }

    return agents;
  }

  /**
   * Deactivate an allowlist (disable agent)
   */
  deactivateAllowlist(agentId: string, reason: string): void {
    const allowlist = this.allowlists.get(agentId);
    if (allowlist) {
      allowlist.isActive = false;
      allowlist.updatedAt = new Date();

      this.recordAudit({
        action: 'ALLOWLIST_DEACTIVATED',
        agentId,
        toolId: '',
        grantedBy: 'System',
        timestamp: new Date(),
        details: `Deactivated allowlist: ${reason}`,
      });
    }
  }

  /**
   * Reactivate an allowlist
   */
  reactivateAllowlist(agentId: string, reason: string): void {
    const allowlist = this.allowlists.get(agentId);
    if (allowlist) {
      allowlist.isActive = true;
      allowlist.updatedAt = new Date();

      this.recordAudit({
        action: 'ALLOWLIST_REACTIVATED',
        agentId,
        toolId: '',
        grantedBy: 'System',
        timestamp: new Date(),
        details: `Reactivated allowlist: ${reason}`,
      });
    }
  }

  /**
   * Get audit trail
   */
  getAuditTrail(filter?: {
    agentId?: string;
    toolId?: string;
    action?: string;
    since?: Date;
  }): ToolAllowlistAuditEntry[] {
    let entries = [...this.auditTrail];

    if (filter?.agentId) {
      entries = entries.filter((e) => e.agentId === filter.agentId);
    }

    if (filter?.toolId) {
      entries = entries.filter((e) => e.toolId === filter.toolId);
    }

    if (filter?.action) {
      entries = entries.filter((e) => e.action === filter.action);
    }

    if (filter?.since) {
      entries = entries.filter((e) => e.timestamp >= filter.since!);
    }

    return entries;
  }

  /**
   * Record audit event
   */
  private recordAudit(entry: ToolAllowlistAuditEntry): void {
    this.auditTrail.push(entry);
  }

  /**
   * Export allowlist configuration for backup
   */
  exportConfiguration(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    for (const [agentId, allowlist] of this.allowlists) {
      config[agentId] = {
        name: allowlist.agentName,
        permissionLevel: allowlist.permissionLevel,
        isActive: allowlist.isActive,
        tools: Array.from(allowlist.tools.values()).map((entry) => ({
          toolId: entry.toolId,
          reason: entry.reason,
          scopes: entry.scopes,
          expiresAt: entry.expiresAt,
        })),
      };
    }

    return config;
  }

  /**
   * Import allowlist configuration
   */
  importConfiguration(config: Record<string, unknown>): void {
    for (const [agentId, agentConfig] of Object.entries(config)) {
      const cfg = agentConfig as Record<string, unknown>;
      const tools = cfg.tools as Array<Record<string, unknown>> || [];

      this.createAllowlist(agentId, cfg.name as string, cfg.permissionLevel as PermissionLevel);

      for (const tool of tools) {
        this.grantToolAccess(
          agentId,
          tool.toolId as string,
          'System',
          tool.reason as string,
          tool.scopes as string[] | undefined,
          tool.expiresAt ? new Date(tool.expiresAt as string) : undefined
        );
      }
    }
  }
}

export interface ToolAllowlistAuditEntry {
  action: 'ALLOWLIST_CREATED' | 'ALLOWLIST_DEACTIVATED' | 'ALLOWLIST_REACTIVATED' | 'TOOL_ACCESS_GRANTED' | 'TOOL_ACCESS_REVOKED';
  agentId: string;
  toolId: string;
  grantedBy: string;
  timestamp: Date;
  details: string;
  scopes?: string[];
  expiresAt?: Date;
}

export default ToolAllowlist;
