/**
 * Judgment Policies Configuration
 * B8 Phase - Policy definitions for different task types
 */

import { JudgmentPolicy } from "./types";

/**
 * Standard policy for general tasks
 */
export const STANDARD_POLICY: JudgmentPolicy = {
  name: "standard",
  description: "Standard task judgment policy for general development tasks",
  requiredCriteria: [
    "branchCorrect",
    "shaUpdated",
    "ciPassed",
    "testsPassed",
    "evidenceSufficient",
    "independentReviewExists",
    "judgeNotExecutor",
    "dependenciesComplete",
  ],
  requiresHumanApproval: true,
  autoEscalate: ["productionProofReal"],
};

/**
 * Strict policy for critical infrastructure changes
 */
export const STRICT_POLICY: JudgmentPolicy = {
  name: "strict",
  description: "Strict judgment policy requiring all criteria for critical changes",
  requiredCriteria: [
    "branchCorrect",
    "shaUpdated",
    "ciPassed",
    "testsPassed",
    "evidenceSufficient",
    "independentReviewExists",
    "judgeNotExecutor",
    "dependenciesComplete",
    "humanApprovalProvided",
    "productionProofReal",
  ],
  requiresHumanApproval: true,
  autoEscalate: [],
};

/**
 * Relaxed policy for documentation and non-critical updates
 */
export const RELAXED_POLICY: JudgmentPolicy = {
  name: "relaxed",
  description: "Relaxed judgment policy for non-critical changes like docs",
  requiredCriteria: [
    "branchCorrect",
    "shaUpdated",
    "evidenceSufficient",
    "judgeNotExecutor",
  ],
  requiresHumanApproval: false,
  autoEscalate: [],
};

/**
 * Security-critical policy for auth and security changes
 */
export const SECURITY_POLICY: JudgmentPolicy = {
  name: "security",
  description: "Security-focused policy with emphasis on code review and evidence",
  requiredCriteria: [
    "branchCorrect",
    "shaUpdated",
    "ciPassed",
    "testsPassed",
    "evidenceSufficient",
    "independentReviewExists",
    "judgeNotExecutor",
    "humanApprovalProvided",
  ],
  requiresHumanApproval: true,
  autoEscalate: ["productionProofReal", "dependenciesComplete"],
};

/**
 * Hotfix policy for urgent production fixes
 */
export const HOTFIX_POLICY: JudgmentPolicy = {
  name: "hotfix",
  description: "Expedited policy for production hotfixes with post-deployment review",
  requiredCriteria: [
    "branchCorrect",
    "shaUpdated",
    "ciPassed",
    "testsPassed",
    "judgeNotExecutor",
    "humanApprovalProvided",
  ],
  requiresHumanApproval: true,
  autoEscalate: [],
};

/**
 * Policy registry mapping task types to policies
 */
export class JudgmentPolicyRegistry {
  private policies: Map<string, JudgmentPolicy> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  /**
   * Register default judgment policies
   */
  private registerDefaultPolicies(): void {
    this.policies.set("standard", STANDARD_POLICY);
    this.policies.set("strict", STRICT_POLICY);
    this.policies.set("relaxed", RELAXED_POLICY);
    this.policies.set("security", SECURITY_POLICY);
    this.policies.set("hotfix", HOTFIX_POLICY);
  }

  /**
   * Get policy by name
   */
  getPolicy(policyName: string): JudgmentPolicy | null {
    return this.policies.get(policyName) ?? null;
  }

  /**
   * Get policy for task type
   */
  getPolicyForTaskType(taskType: string): JudgmentPolicy {
    // Map task types to appropriate policies
    const typeToPolicy: Record<string, string> = {
      documentation: "relaxed",
      feature: "standard",
      bugfix: "standard",
      security: "security",
      infrastructure: "strict",
      auth: "security",
      hotfix: "hotfix",
      refactor: "standard",
      test: "relaxed",
      devops: "strict",
    };

    const policyName = typeToPolicy[taskType.toLowerCase()] || "standard";
    return this.getPolicy(policyName) || STANDARD_POLICY;
  }

  /**
   * Register custom policy
   */
  registerPolicy(policy: JudgmentPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * List all policies
   */
  listPolicies(): JudgmentPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Remove policy
   */
  removePolicy(policyName: string): boolean {
    return this.policies.delete(policyName);
  }

  /**
   * Check if policy exists
   */
  hasPolicy(policyName: string): boolean {
    return this.policies.has(policyName);
  }

  /**
   * Get default policy
   */
  getDefaultPolicy(): JudgmentPolicy {
    return STANDARD_POLICY;
  }
}

/**
 * Singleton instance for policy registry
 */
export const policyRegistry = new JudgmentPolicyRegistry();
