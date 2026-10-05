/**
 * Evidence Validator - Redaction & Secret Detection
 * B8 Phase - Evidence validation with security focus
 */

import { Evidence, EvidenceValidationResult } from "../judge/types";

/**
 * Patterns to detect sensitive information
 */
const SECRET_PATTERNS = {
  apiKey: /api[_-]?key["\s:=]*([a-zA-Z0-9_-]{20,})/gi,
  secret: /secret["\s:=]*([a-zA-Z0-9_-]{20,})/gi,
  password: /password["\s:=]*([^"\s\n]{8,})/gi,
  token: /token["\s:=]*([a-zA-Z0-9_.-]{20,})/gi,
  bearer: /bearer\s+([a-zA-Z0-9_.-]+)/gi,
  auth: /authorization["\s:=]*([^"\s\n]+)/gi,
  privateKey: /private[_-]?key["\s:=]*([a-zA-Z0-9+/=\n]{50,})/gi,
  credential: /credential[s]?["\s:=]*([a-zA-Z0-9_:-]{20,})/gi,
  awsKey: /AKIA[0-9A-Z]{16}/g,
  jwtToken: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  githubToken: /ghp_[a-zA-Z0-9_]{36,}/g,
  slackToken: /xoxb-[a-zA-Z0-9-]{140,}/g,
  mongoUri: /mongodb(\+srv)?:\/\/[a-zA-Z0-9:@./-]+/gi,
  databaseUrl: /(?:postgresql|mysql|mongodb):\/\/[a-zA-Z0-9:@./-]+/gi,
};

/**
 * Patterns that are safe to include in evidence
 */
const SAFE_PATTERNS = {
  ciLog: /^CI\/CD Build Log$/i,
  testResult: /^Test Results$/i,
  deploymentLog: /^Deployment Log$/i,
  commitLog: /^(Commit|git log)$/i,
};

/**
 * Evidence validator for redacting sensitive data and detecting secrets
 */
export class EvidenceValidator {
  /**
   * Validate evidence for sensitive content
   */
  async validate(evidence: Evidence): Promise<EvidenceValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const secretsDetected: string[] = [];

    // Validate evidence structure
    if (!evidence.id) {
      errors.push("Evidence must have an ID");
    }

    if (!evidence.content || evidence.content.length === 0) {
      errors.push("Evidence content cannot be empty");
    }

    if (!evidence.type) {
      errors.push("Evidence type must be specified");
    }

    if (!evidence.source) {
      errors.push("Evidence source must be specified");
    }

    // Detect secrets in content
    const detected = this.detectSecrets(evidence.content);
    secretsDetected.push(...detected);

    if (detected.length > 0) {
      errors.push(`${detected.length} potential secrets detected in evidence`);
    }

    // Validate evidence type
    if (!this.isValidEvidenceType(evidence.type)) {
      warnings.push(`Unknown evidence type: ${evidence.type}`);
    }

    // Check if evidence is from trusted source
    if (!this.isTrustedSource(evidence.source)) {
      warnings.push(`Evidence from untrusted source: ${evidence.source}`);
    }

    const valid = errors.length === 0 && secretsDetected.length === 0;

    const result: EvidenceValidationResult = {
      valid,
      errors,
      warnings,
      secretsDetected,
    };

    // Redact if valid but has minor issues
    if (valid || (warnings.length > 0 && secretsDetected.length === 0)) {
      result.redactedContent = this.redactSensitiveData(evidence.content);
    }

    return result;
  }

  /**
   * Detect secrets in text content
   */
  detectSecrets(text: string): string[] {
    const detected: string[] = [];
    const seen = new Set<string>();

    for (const [patternName, pattern] of Object.entries(SECRET_PATTERNS)) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Avoid duplicates
          if (!seen.has(match)) {
            detected.push(`${patternName}: ${match.substring(0, 20)}...`);
            seen.add(match);
          }
        });
      }
    }

    return detected;
  }

  /**
   * Redact sensitive data from evidence
   */
  redactSensitiveData(content: string): string {
    let redacted = content;

    // Redact all secret patterns
    for (const pattern of Object.values(SECRET_PATTERNS)) {
      redacted = redacted.replace(pattern, "[REDACTED]");
    }

    // Also redact email addresses
    // Bound local/domain segments so a long non-email token cannot trigger
    // quadratic backtracking during evidence redaction.
    redacted = redacted.replace(
      /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,63}/g,
      "[EMAIL]"
    );

    // Redact IP addresses
    redacted = redacted.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[IP]");

    // Redact potential credit card numbers
    redacted = redacted.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, "[CARD]");

    // Redact phone numbers
    redacted = redacted.replace(/\b(?:\+1|1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]");

    return redacted;
  }

  /**
   * Check if evidence type is valid
   */
  private isValidEvidenceType(type: string): boolean {
    const validTypes = [
      "ci_log",
      "test_result",
      "deployment_log",
      "review",
      "approval",
      "commit",
      "other",
    ];
    return validTypes.includes(type);
  }

  /**
   * Check if evidence source is trusted
   */
  private isTrustedSource(source: string): boolean {
    const trustedSources = [
      "github",
      "github.com",
      "gitlab",
      "gitlab.com",
      "bitbucket",
      "bitbucket.org",
      "jenkins",
      "circleci",
      "travis",
      "github-actions",
      "codecov",
      "sonarqube",
      "internal",
      "slack",
      "email",
    ];

    return trustedSources.some((trusted) =>
      source.toLowerCase().includes(trusted)
    );
  }

  /**
   * Validate evidence for production deployment
   */
  validateForProduction(evidence: Evidence[]): {
    valid: boolean;
    errors: string[];
    summary: string;
  } {
    const errors: string[] = [];

    if (evidence.length === 0) {
      errors.push("No evidence provided for production deployment");
      return {
        valid: false,
        errors,
        summary: "No evidence available",
      };
    }

    // Ensure we have CI logs
    const hasCiLog = evidence.some((e) => e.type === "ci_log");
    if (!hasCiLog) {
      errors.push("CI logs required for production deployment");
    }

    // Ensure we have test results
    const hasTestResult = evidence.some((e) => e.type === "test_result");
    if (!hasTestResult) {
      errors.push("Test results required for production deployment");
    }

    // Ensure we have deployment logs
    const hasDeploymentLog = evidence.some((e) => e.type === "deployment_log");
    if (!hasDeploymentLog) {
      errors.push("Deployment logs required for production deployment");
    }

    // Check for secrets in all evidence
    const secretsInEvidence: string[] = [];
    for (const item of evidence) {
      const detected = this.detectSecrets(item.content);
      secretsInEvidence.push(...detected);
    }

    if (secretsInEvidence.length > 0) {
      errors.push(`Secrets detected in evidence: ${secretsInEvidence.join(", ")}`);
    }

    const valid = errors.length === 0;
    const summary = valid
      ? "All evidence validated for production"
      : `Production validation failed: ${errors.length} issues`;

    return {
      valid,
      errors,
      summary,
    };
  }

  /**
   * Extract and sanitize URLs from evidence
   */
  extractUrls(content: string): string[] {
    const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_.+~#?&/=]*)/g;
    const matches = content.match(urlPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Check evidence completeness
   */
  checkCompleteness(evidence: Evidence[]): {
    complete: boolean;
    missing: string[];
    hasOptional: string[];
  } {
    const types = evidence.map((e) => e.type);

    const required = ["ci_log", "test_result"] as const;
    const optional = ["deployment_log", "review", "approval"] as const;

    const missing = required.filter((r) => !types.includes(r));
    const hasOptional = optional.filter((o) => types.includes(o));

    return {
      complete: missing.length === 0,
      missing,
      hasOptional,
    };
  }
}
