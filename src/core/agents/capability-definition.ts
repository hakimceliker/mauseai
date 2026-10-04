/**
 * Capability Definition Module
 *
 * Defines the capability catalog and registry for agent capabilities.
 * Capabilities represent specific actions or domains an agent can handle.
 */

import { RiskLevel } from "@/src/core/contracts/agent-contract";

/**
 * Capability definition describing a specific agent capability
 */
export interface Capability {
  name: string; // e.g., "code-review", "deploy", "incident-response"
  description: string;
  requiredTools: string[]; // tool IDs needed for this capability
  requiredModel: string | null; // specific model needed, or null for any
  riskLevel: RiskLevel;
  requiresApproval: boolean; // human approval required?
  requiresReview: boolean; // independent review required?
  examples: string[]; // example tasks
}

/**
 * Capability registry - manages the catalog of available capabilities
 */
export class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();

  constructor() {
    this.initializeDefaultCapabilities();
  }

  /**
   * Define and register a new capability
   */
  defineCapability(cap: Capability): void {
    if (!cap.name) {
      throw new Error("Capability name is required");
    }

    if (!cap.description) {
      throw new Error("Capability description is required");
    }

    if (!Array.isArray(cap.requiredTools)) {
      throw new Error("Capability requiredTools must be an array");
    }

    if (!Array.isArray(cap.examples) || cap.examples.length === 0) {
      throw new Error("Capability must have at least one example");
    }

    this.capabilities.set(cap.name, cap);
    console.log(`[CapabilityRegistry] Registered capability: ${cap.name}`);
  }

  /**
   * Get capability details by name
   */
  getCapability(name: string): Capability | null {
    return this.capabilities.get(name) || null;
  }

  /**
   * Check if capability exists
   */
  hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }

  /**
   * Check if agent has capability
   * Note: This is a simple name check, agent capabilities list should be checked separately
   */
  capabilityExists(capabilityName: string): boolean {
    return this.hasCapability(capabilityName);
  }

  /**
   * List all registered capabilities
   */
  listCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * List capabilities by risk level
   */
  getCapabilitiesByRiskLevel(riskLevel: RiskLevel): Capability[] {
    return Array.from(this.capabilities.values()).filter(
      (cap) => cap.riskLevel === riskLevel
    );
  }

  /**
   * List capabilities requiring human approval
   */
  getCapabilitiesRequiringApproval(): Capability[] {
    return Array.from(this.capabilities.values()).filter(
      (cap) => cap.requiresApproval
    );
  }

  /**
   * Initialize default capabilities for the system
   */
  private initializeDefaultCapabilities(): void {
    // Orchestration capability
    this.defineCapability({
      name: "orchestration",
      description:
        "Master orchestration and coordination of multi-agent workflows",
      requiredTools: [
        "agent-registry",
        "task-manager",
        "execution-monitor",
        "evidence-gate",
      ],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      requiresReview: true,
      examples: [
        "Decompose complex goal into subtasks",
        "Coordinate parallel agent execution",
        "Handle cross-agent dependencies",
      ],
    });

    // Planning capability
    this.defineCapability({
      name: "planning",
      description: "Task decomposition and planning for goal achievement",
      requiredTools: ["llm-api", "cost-calculator", "dependency-analyzer"],
      requiredModel: null,
      riskLevel: RiskLevel.MEDIUM,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Decompose goal into subtasks",
        "Estimate task cost in tokens/USD",
        "Identify task dependencies",
      ],
    });

    // Cost estimation capability
    this.defineCapability({
      name: "cost-estimation",
      description: "Estimate computational and financial costs",
      requiredTools: ["cost-calculator", "token-counter"],
      requiredModel: null,
      riskLevel: RiskLevel.LOW,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Calculate token costs",
        "Estimate USD costs",
        "Compare cost of alternative approaches",
      ],
    });

    // Code review capability
    this.defineCapability({
      name: "code-review",
      description: "Code review and quality assurance",
      requiredTools: ["github-api", "code-analyzer", "linter"],
      requiredModel: null,
      riskLevel: RiskLevel.MEDIUM,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Review pull requests",
        "Identify bugs and improvements",
        "Verify code quality",
      ],
    });

    // Security review capability
    this.defineCapability({
      name: "security-review",
      description: "Security analysis and vulnerability assessment",
      requiredTools: ["security-scanner", "code-analyzer", "policy-checker"],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: false,
      requiresReview: true,
      examples: [
        "Scan for security vulnerabilities",
        "Verify policy compliance",
        "Check access control",
      ],
    });

    // Deployment capability
    this.defineCapability({
      name: "deploy",
      description: "Manage production deployments and infrastructure",
      requiredTools: [
        "vercel-api",
        "github-api",
        "docker",
        "monitoring",
        "rollback-tools",
      ],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      requiresReview: true,
      examples: [
        "Deploy application to production",
        "Manage infrastructure changes",
        "Scale resources",
      ],
    });

    // Infrastructure management capability
    this.defineCapability({
      name: "infrastructure",
      description: "Infrastructure provisioning and management",
      requiredTools: [
        "terraform",
        "docker",
        "kubernetes",
        "monitoring",
        "cloud-api",
      ],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      requiresReview: true,
      examples: [
        "Provision cloud resources",
        "Configure load balancing",
        "Manage database clusters",
      ],
    });

    // Incident response capability
    this.defineCapability({
      name: "incident-response",
      description: "Incident response and production troubleshooting",
      requiredTools: [
        "monitoring",
        "deployment",
        "communication",
        "logs",
        "metrics",
      ],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      requiresReview: true,
      examples: [
        "Respond to production incidents",
        "Analyze error logs",
        "Execute emergency rollbacks",
      ],
    });

    // Rollback capability
    this.defineCapability({
      name: "rollback",
      description: "Emergency rollback and recovery procedures",
      requiredTools: ["deployment", "version-control", "monitoring"],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: true,
      requiresReview: false,
      examples: [
        "Rollback failed deployments",
        "Restore previous version",
        "Emergency recovery",
      ],
    });

    // Verification capability
    this.defineCapability({
      name: "verification",
      description:
        "Independent verification and validation of agent work products",
      requiredTools: ["evidence-gate", "criteria-checker", "test-runner"],
      requiredModel: null,
      riskLevel: RiskLevel.CRITICAL,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Verify task completion against requirements",
        "Validate evidence quality",
        "Check success criteria",
      ],
    });

    // Evidence assessment capability
    this.defineCapability({
      name: "evidence-assessment",
      description: "Assess quality and sufficiency of evidence artifacts",
      requiredTools: ["evidence-gate", "analyzer"],
      requiredModel: null,
      riskLevel: RiskLevel.MEDIUM,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Validate evidence artifacts",
        "Check evidence completeness",
        "Assess artifact quality",
      ],
    });

    // Error handling capability
    this.defineCapability({
      name: "error-handling",
      description: "Error detection, analysis, and recovery",
      requiredTools: ["monitoring", "logs", "recovery-tools", "deployment"],
      requiredModel: null,
      riskLevel: RiskLevel.HIGH,
      requiresApproval: false,
      requiresReview: true,
      examples: [
        "Detect errors in task execution",
        "Analyze failure root cause",
        "Execute recovery procedures",
      ],
    });

    // Decision making capability
    this.defineCapability({
      name: "decision-making",
      description: "Human decision-making and judgment",
      requiredTools: ["communication", "monitoring"],
      requiredModel: null,
      riskLevel: RiskLevel.LOW,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Make strategic decisions",
        "Approve important actions",
        "Escalate complex issues",
      ],
    });

    // Approval capability
    this.defineCapability({
      name: "approval",
      description: "Grant approvals and authorizations",
      requiredTools: ["communication"],
      requiredModel: null,
      riskLevel: RiskLevel.MEDIUM,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Approve deployments",
        "Grant resource access",
        "Authorize critical actions",
      ],
    });

    // Escalation capability
    this.defineCapability({
      name: "escalation",
      description: "Escalate issues to higher authority",
      requiredTools: ["communication"],
      requiredModel: null,
      riskLevel: RiskLevel.LOW,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Escalate unresolved issues",
        "Route to appropriate team",
        "Request human intervention",
      ],
    });

    // Retry management capability
    this.defineCapability({
      name: "retry",
      description: "Manage task retries and transient failure recovery",
      requiredTools: ["task-manager", "monitoring"],
      requiredModel: null,
      riskLevel: RiskLevel.MEDIUM,
      requiresApproval: false,
      requiresReview: false,
      examples: [
        "Retry failed tasks",
        "Implement exponential backoff",
        "Handle transient failures",
      ],
    });

    console.log(
      "[CapabilityRegistry] Initialized 16 default capabilities"
    );
  }
}

/**
 * Singleton instance of the capability registry
 */
let capabilityRegistry: CapabilityRegistry | null = null;

/**
 * Get or create the global capability registry
 */
export function getCapabilityRegistry(): CapabilityRegistry {
  if (!capabilityRegistry) {
    capabilityRegistry = new CapabilityRegistry();
  }
  return capabilityRegistry;
}

/**
 * Reset capability registry (useful for testing)
 */
export function resetCapabilityRegistry(): void {
  capabilityRegistry = null;
}
