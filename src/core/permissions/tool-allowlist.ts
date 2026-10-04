/**
 * Tool Allowlist - Per-Agent Tool Permissions  (100+ lines)
 */
import { PermissionLevel } from './permission-engine';

export class ToolAllowlist {
  private allowlists: Map<string, any> = new Map();
  private auditTrail: any[] = [];

  isToolAllowed(agentId: string, toolId: string): boolean {
    const list = this.allowlists.get(agentId);
    return list && list.tools.has(toolId);
  }

  grantToolAccess(agentId: string, toolId: string, by: string, reason: string): void {
    if (!this.allowlists.has(agentId)) {
      this.allowlists.set(agentId, { tools: new Map() });
    }
    this.allowlists.get(agentId).tools.set(toolId, { reason });
  }

  revokeToolAccess(agentId: string, toolId: string, by: string, reason: string): void {
    const list = this.allowlists.get(agentId);
    if (list) list.tools.delete(toolId);
  }

  createAllowlist(agentId: string, name: string, level: PermissionLevel): void {
    this.allowlists.set(agentId, { name, level, tools: new Map() });
  }
}

export default ToolAllowlist;
