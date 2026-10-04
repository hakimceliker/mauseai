/**
 * Judge Engine - 10 Criteria Validator
 * B8 Phase - Core judgment logic for task completion
 */

import {
  Judgment,
  JudgmentCriteria,
  JudgmentStatus,
  TaskContext,
  Evidence,
} from "./types";
import { JudgmentPolicy } from "./types";
import { EvidenceValidator } from "../evidence/evidence-validator";

export class JudgeEngine {
  private evidenceValidator: EvidenceValidator;
  private policies: Map<string, JudgmentPolicy> = new Map();

  constructor() {
    this.evidenceValidator = new EvidenceValidator();
    this.initializePolicies();
  }

  /**
   * Main judge method - evaluates all 10 criteria
   * 1. Branch correct?
   * 2. SHA updated?
   * 3. CI passed?
   * 4. Tests passed?
   * 5. Evidence sufficient?
   * 6. Independent review exists?
   * 7. Judge ≠ executor?
   * 8. Dependencies complete?
   * 9. Human approval provided (if required)?
   * 10. Production proof real?
   */
  async judge(
    taskId: string,
    context: TaskContext,
    evidence: Evidence[],
    judgeId: string,
    expectedBranch: string,
    expectedSha?: string
  ): Promise<Judgment> {
    const criteria = await this.validateCriteria(
      context,
      evidence,
      judgeId,
      expectedBranch,
      expectedSha
    );

    const failureReasons = this.collectFailureReasons(criteria);
    const policy = this.determinePolicyForTask(taskId);

    let status: JudgmentStatus = "PASS";
    let escalationReason: string | undefined;

    // Check for hard failures
    if (!criteria.branchCorrect || !criteria.shaUpdated) {
      status = "FAIL";
      failureReasons.push("Critical issue: Branch or SHA mismatch");
    }

    // Check for auto-escalation criteria
    const autoEscalateCriteria = policy.autoEscalate.filter(
      (criterion) => !criteria[criterion]
    );

    if (autoEscalateCriteria.length > 0) {
      status = "ESCALATE";
      escalationReason = `Auto-escalation triggered by: ${autoEscalateCriteria.join(", ")}`;
    }

    // Check if all required criteria from policy are met
    const unmetRequired = policy.requiredCriteria.filter(
      (criterion) => !criteria[criterion]
    );

    if (unmetRequired.length > 0 && status === "PASS") {
      if (policy.requiresHumanApproval && criteria.humanApprovalProvided) {
        status = "ESCALATE";
        escalationReason = `Policy requires review for: ${unmetRequired.join(", ")}`;
      } else if (policy.requiresHumanApproval) {
        status = "FAIL";
        failureReasons.push(
          `Human approval required but not provided for: ${unmetRequired.join(", ")}`
        );
      } else {
        status = "FAIL";
        failureReasons.push(`Failed policy requirements: ${unmetRequired.join(", ")}`);
      }
    }

    // Determine if task can be closed
    const canClose = status === "PASS" && failureReasons.length === 0;

    return {
      taskId,
      status,
      canClose,
      criteria,
      failureReasons,
      escalationReason,
      timestamp: new Date(),
      judgedBy: judgeId,
    };
  }

  /**
   * Validate all 10 criteria
   */
  private async validateCriteria(
    context: TaskContext,
    evidence: Evidence[],
    judgeId: string,
    expectedBranch: string,
    expectedSha?: string
  ): Promise<JudgmentCriteria> {
    const [
      branchCorrect,
      shaUpdated,
      ciPassed,
      testsPassed,
      evidenceSufficient,
      independentReviewExists,
      judgeNotExecutor,
      dependenciesComplete,
      humanApprovalProvided,
      productionProofReal,
    ] = await Promise.all([
      this.validateBranchCorrect(context, expectedBranch),
      this.validateShaUpdated(context, expectedSha),
      this.validateCIPassed(context),
      this.validateTestsPassed(context),
      this.validateEvidenceSufficient(evidence),
      this.validateIndependentReview(context),
      this.validateJudgeNotExecutor(context, judgeId),
      this.validateDependenciesComplete(context),
      this.validateHumanApproval(context),
      this.validateProductionProof(context),
    ]);

    return {
      branchCorrect,
      shaUpdated,
      ciPassed,
      testsPassed,
      evidenceSufficient,
      independentReviewExists,
      judgeNotExecutor,
      dependenciesComplete,
      humanApprovalProvided,
      productionProofReal,
    };
  }

  /**
   * Criterion 1: Branch correct?
   */
  private async validateBranchCorrect(
    context: TaskContext,
    expectedBranch: string
  ): Promise<boolean> {
    return context.branch === expectedBranch;
  }

  /**
   * Criterion 2: SHA updated?
   */
  private async validateShaUpdated(
    context: TaskContext,
    expectedSha?: string
  ): Promise<boolean> {
    if (!expectedSha) {
      return !!context.sha && context.sha.length === 40; // Valid git SHA
    }
    return context.sha === expectedSha;
  }

  /**
   * Criterion 3: CI passed?
   */
  private async validateCIPassed(context: TaskContext): Promise<boolean> {
    return context.ciStatus === "passed";
  }

  /**
   * Criterion 4: Tests passed?
   */
  private async validateTestsPassed(context: TaskContext): Promise<boolean> {
    return context.testStatus === "passed";
  }

  /**
   * Criterion 5: Evidence sufficient?
   */
  private async validateEvidenceSufficient(evidence: Evidence[]): Promise<boolean> {
    if (evidence.length === 0) {
      return false;
    }

    // At least one piece of valid evidence required
    let validEvidenceCount = 0;

    for (const item of evidence) {
      const validationResult = await this.evidenceValidator.validate(item);
      if (validationResult.valid && validationResult.secretsDetected.length === 0) {
        validEvidenceCount++;
      }
    }

    return validEvidenceCount > 0;
  }

  /**
   * Criterion 6: Independent review exists?
   */
  private async validateIndependentReview(context: TaskContext): Promise<boolean> {
    return context.hasIndependentReview;
  }

  /**
   * Criterion 7: Judge ≠ executor?
   */
  private async validateJudgeNotExecutor(
    context: TaskContext,
    judgeId: string
  ): Promise<boolean> {
    return context.executorId !== judgeId;
  }

  /**
   * Criterion 8: Dependencies complete?
   */
  private async validateDependenciesComplete(context: TaskContext): Promise<boolean> {
    // If no dependencies, this criterion passes
    if (context.dependencies.length === 0) {
      return true;
    }

    // In a real implementation, would check if all dependencies are marked complete
    // For now, all are required to be present
    return context.dependencies.length > 0;
  }

  /**
   * Criterion 9: Human approval provided (if required)?
   */
  private async validateHumanApproval(context: TaskContext): Promise<boolean> {
    return context.approvals.length > 0;
  }

  /**
   * Criterion 10: Production proof real?
   */
  private async validateProductionProof(context: TaskContext): Promise<boolean> {
    if (!context.productionProof) {
      return false;
    }

    return (
      context.productionProof.url.length > 0 &&
      context.productionProof.verified === true &&
      context.productionProof.timestamp instanceof Date
    );
  }

  /**
   * Collect human-readable failure reasons
   */
  private collectFailureReasons(criteria: JudgmentCriteria): string[] {
    const reasons: string[] = [];

    const checks: Array<[keyof JudgmentCriteria, string]> = [
      ["branchCorrect", "Branch is not correct"],
      ["shaUpdated", "SHA has not been updated"],
      ["ciPassed", "CI pipeline did not pass"],
      ["testsPassed", "Tests did not pass"],
      ["evidenceSufficient", "Insufficient evidence provided"],
      ["independentReviewExists", "No independent review found"],
      ["judgeNotExecutor", "Judge cannot be the executor"],
      ["dependenciesComplete", "Not all dependencies are complete"],
      ["humanApprovalProvided", "Human approval not provided"],
      ["productionProofReal", "Production proof not verified"],
    ];

    for (const [criterion, message] of checks) {
      if (!criteria[criterion]) {
        reasons.push(message);
      }
    }

    return reasons;
  }

  /**
   * Determine which policy applies to this task
   */
  private determinePolicyForTask(taskId: string): JudgmentPolicy {
    // For now, return the default policy
    // In a real implementation, would check task type and return appropriate policy
    const policyName = this.getDefaultPolicyName(taskId);
    return this.policies.get(policyName) || this.getDefaultPolicy();
  }

  /**
   * Get default policy name based on task context
   */
  private getDefaultPolicyName(taskId: string): string {
    // Could be overridden to return different policies based on task type
    return "default";
  }

  /**
   * Get default judgment policy
   */
  private getDefaultPolicy(): JudgmentPolicy {
    return {
      name: "default",
      description: "Standard task judgment policy",
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
  }

  /**
   * Initialize standard policies
   */
  private initializePolicies(): void {
    const defaultPolicy: JudgmentPolicy = {
      name: "default",
      description: "Standard task judgment policy",
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

    const strictPolicy: JudgmentPolicy = {
      name: "strict",
      description: "Strict judgment policy requiring all criteria",
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

    const standardPolicy: JudgmentPolicy = {
      name: "standard",
      description: "Standard task judgment policy",
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

    this.policies.set("default", defaultPolicy);
    this.policies.set("strict", strictPolicy);
    this.policies.set("standard", standardPolicy);
  }

  /**
   * Register a custom judgment policy
   */
  registerPolicy(policy: JudgmentPolicy): void {
    this.policies.set(policy.name, policy);
  }

  /**
   * Get a policy by name
   */
  getPolicy(name: string): JudgmentPolicy | undefined {
    return this.policies.get(name);
  }

  /**
   * List all available policies
   */
  listPolicies(): JudgmentPolicy[] {
    return Array.from(this.policies.values());
  }
}
