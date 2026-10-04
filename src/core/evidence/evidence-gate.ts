/**
 * Evidence Gate - Evidence Validation Framework
 * B8 Phase - Entry point for evidence validation workflow
 */

import { Evidence, EvidenceValidationResult } from "../judge/types";
import { EvidenceValidator } from "./evidence-validator";

/**
 * Configuration for evidence gate behavior
 */
export interface EvidenceGateConfig {
  requireMinimumEvidence: number;
  allowedTypes: string[];
  trustedSources: string[];
  redactSensitiveData: boolean;
  failOnSecrets: boolean;
  logValidationResults: boolean;
}

/**
 * Result of evidence gate validation
 */
export interface EvidenceGateResult {
  passed: boolean;
  totalEvidence: number;
  validEvidence: number;
  invalidEvidence: number;
  evidenceDetails: Array<{
    evidenceId: string;
    type: string;
    valid: boolean;
    errors: string[];
    secretsDetected: string[];
  }>;
  summary: string;
  recommendations: string[];
}

/**
 * Evidence Gate - Controls flow of evidence through validation
 */
export class EvidenceGate {
  private validator: EvidenceValidator;
  private config: EvidenceGateConfig;

  constructor(config?: Partial<EvidenceGateConfig>) {
    this.validator = new EvidenceValidator();
    this.config = {
      requireMinimumEvidence: 2,
      allowedTypes: [
        "ci_log",
        "test_result",
        "deployment_log",
        "review",
        "approval",
        "commit",
        "other",
      ],
      trustedSources: [
        "github",
        "gitlab",
        "bitbucket",
        "jenkins",
        "circleci",
        "internal",
      ],
      redactSensitiveData: true,
      failOnSecrets: true,
      logValidationResults: false,
      ...config,
    };
  }

  /**
   * Main validation gate - processes all evidence
   */
  async validate(evidence: Evidence[]): Promise<EvidenceGateResult> {
    const evidenceDetails: EvidenceGateResult["evidenceDetails"] = [];
    let validCount = 0;
    let invalidCount = 0;

    // Validate each piece of evidence
    for (const item of evidence) {
      const result = await this.validator.validate(item);
      const isValid = result.valid && (!this.config.failOnSecrets || result.secretsDetected.length === 0);

      evidenceDetails.push({
        evidenceId: item.id,
        type: item.type,
        valid: isValid,
        errors: result.errors,
        secretsDetected: result.secretsDetected,
      });

      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    // Determine if gate passes
    const passed =
      validCount >= this.config.requireMinimumEvidence &&
      invalidCount === 0;

    // Generate summary and recommendations
    const { summary, recommendations } = this.generateSummary(
      evidence.length,
      validCount,
      invalidCount,
      evidenceDetails
    );

    const result: EvidenceGateResult = {
      passed,
      totalEvidence: evidence.length,
      validEvidence: validCount,
      invalidEvidence: invalidCount,
      evidenceDetails,
      summary,
      recommendations,
    };

    if (this.config.logValidationResults) {
      this.logResult(result);
    }

    return result;
  }

  /**
   * Batch validate evidence items
   */
  async validateBatch(
    evidenceBatches: Evidence[][]
  ): Promise<EvidenceGateResult[]> {
    return Promise.all(
      evidenceBatches.map((batch) => this.validate(batch))
    );
  }

  /**
   * Redact all evidence
   */
  async redactAll(evidence: Evidence[]): Promise<Evidence[]> {
    return evidence.map((item) => ({
      ...item,
      content: this.validator["redactSensitiveData"](item.content),
      isRedacted: true,
    }));
  }

  /**
   * Check evidence completeness for task type
   */
  checkCompleteness(evidence: Evidence[], taskType: string): {
    complete: boolean;
    missing: string[];
  } {
    const requiredByType: Record<string, string[]> = {
      deployment: ["ci_log", "test_result", "deployment_log"],
      security: ["ci_log", "test_result", "review"],
      feature: ["ci_log", "test_result"],
      hotfix: ["ci_log", "test_result"],
      default: ["ci_log", "test_result"],
    };

    const required = requiredByType[taskType] || requiredByType.default;
    const types = evidence.map((e) => e.type);
    const missing = required.filter((r) => !types.includes(r));

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  /**
   * Generate summary and recommendations
   */
  private generateSummary(
    total: number,
    valid: number,
    invalid: number,
    details: EvidenceGateResult["evidenceDetails"]
  ): { summary: string; recommendations: string[] } {
    const recommendations: string[] = [];
    let summary = "";

    if (total === 0) {
      summary = "No evidence provided";
      recommendations.push("Provide at least 2 pieces of evidence");
      return { summary, recommendations };
    }

    const validPercentage = Math.round((valid / total) * 100);

    if (validPercentage === 100) {
      summary = `All ${total} evidence items passed validation`;
    } else if (validPercentage >= 75) {
      summary = `${valid}/${total} evidence items passed (${validPercentage}%)`;
    } else {
      summary = `Only ${valid}/${total} evidence items passed (${validPercentage}%)`;
    }

    // Generate recommendations based on issues
    const secretsCount = details.filter((d) => d.secretsDetected.length > 0).length;
    if (secretsCount > 0) {
      recommendations.push(`${secretsCount} evidence item(s) contain potential secrets - review and redact`);
    }

    const errorsCount = details.filter((d) => d.errors.length > 0).length;
    if (errorsCount > 0) {
      recommendations.push(`${errorsCount} evidence item(s) have validation errors - address before approval`);
    }

    if (valid < this.config.requireMinimumEvidence) {
      recommendations.push(
        `Provide at least ${this.config.requireMinimumEvidence} valid evidence items`
      );
    }

    const typeDistribution = this.getTypeDistribution(details);
    const missingTypes = this.config.allowedTypes.filter(
      (type) => !typeDistribution[type]
    );

    if (missingTypes.length > 0 && valid < this.config.requireMinimumEvidence) {
      recommendations.push(
        `Consider providing evidence of type: ${missingTypes.slice(0, 2).join(", ")}`
      );
    }

    return { summary, recommendations };
  }

  /**
   * Get distribution of evidence types
   */
  private getTypeDistribution(
    details: EvidenceGateResult["evidenceDetails"]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const detail of details) {
      distribution[detail.type] = (distribution[detail.type] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Log validation result
   */
  private logResult(result: EvidenceGateResult): void {
    console.log("[EvidenceGate]", result.summary);
    if (result.recommendations.length > 0) {
      console.log("[EvidenceGate] Recommendations:");
      result.recommendations.forEach((rec) => console.log("  -", rec));
    }
  }

  /**
   * Configure gate settings
   */
  configure(config: Partial<EvidenceGateConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): EvidenceGateConfig {
    return { ...this.config };
  }

  /**
   * Create a stricter gate for production
   */
  static createProductionGate(): EvidenceGate {
    return new EvidenceGate({
      requireMinimumEvidence: 3,
      redactSensitiveData: true,
      failOnSecrets: true,
      logValidationResults: true,
    });
  }

  /**
   * Create a lenient gate for development
   */
  static createDevelopmentGate(): EvidenceGate {
    return new EvidenceGate({
      requireMinimumEvidence: 1,
      redactSensitiveData: false,
      failOnSecrets: false,
      logValidationResults: false,
    });
  }

  /**
   * Create a gate for security reviews
   */
  static createSecurityGate(): EvidenceGate {
    return new EvidenceGate({
      requireMinimumEvidence: 2,
      redactSensitiveData: true,
      failOnSecrets: true,
      logValidationResults: true,
    });
  }
}
