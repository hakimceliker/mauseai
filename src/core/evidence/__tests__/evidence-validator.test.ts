/**
 * Evidence Validator Tests
 * B8 Phase - Testing secret detection and redaction
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EvidenceValidator } from "../evidence-validator";
import { Evidence } from "../../judge/types";

const TEST_API_KEY = "sk_live_" + "x".repeat(32);

describe("EvidenceValidator", () => {
  let validator: EvidenceValidator;

  beforeEach(() => {
    validator = new EvidenceValidator();
  });

  describe("detectSecrets()", () => {
    it("should detect API keys", () => {
      const text = `api_key = "${TEST_API_KEY}"`;
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]).toContain("apiKey");
    });

    it("should detect AWS keys", () => {
      const text = "AWS_KEY=AKIA2IXQN7DXMQ6Z5H7K";
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]).toContain("awsKey");
    });

    it("should detect JWT tokens", () => {
      const text =
        "token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets.some((secret) => secret.startsWith("jwtToken:"))).toBe(true);
    });

    it("should detect GitHub tokens", () => {
      const text = "github_token = ghp_1234567890123456789012345678901234567890";
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets.some((secret) => secret.startsWith("githubToken:"))).toBe(true);
    });

    it("should detect MongoDB URIs", () => {
      const text = "mongodb://user:password@mongodb.example.com:27017/database";
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets.some((secret) => secret.startsWith("mongoUri:"))).toBe(true);
    });

    it("should detect passwords", () => {
      const text = 'password = "MySecurePassword123!"';
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0]).toContain("password");
    });

    it("should not have false positives", () => {
      const text = "This is a regular CI log output with no secrets";
      const secrets = validator.detectSecrets(text);
      expect(secrets.length).toBe(0);
    });
  });

  describe("redactSensitiveData()", () => {
    it("should redact API keys", () => {
      const content =
        `api_key = "${TEST_API_KEY}"`;
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("sk_live");
      expect(redacted).toContain("[REDACTED]");
    });

    it("should redact email addresses", () => {
      const content = "Contact: user@example.com";
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("@");
      expect(redacted).toContain("[EMAIL]");
    });

    it("should redact IP addresses", () => {
      const content = "Server IP: 192.168.1.100";
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("192.168.1.100");
      expect(redacted).toContain("[IP]");
    });

    it("should redact credit card numbers", () => {
      const content = "Card: 4532-1488-0343-6467";
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("4532");
      expect(redacted).toContain("[CARD]");
    });

    it("should redact phone numbers", () => {
      const content = "Call: +1 (555) 123-4567";
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("555");
      expect(redacted).toContain("[PHONE]");
    });

    it("should redact multiple sensitive items", () => {
      const content =
        "User: user@example.com, Password: SecurePass123, IP: 10.0.0.1";
      const redacted = validator.redactSensitiveData(content);
      expect(redacted).not.toContain("user@example.com");
      expect(redacted).not.toContain("SecurePass");
      expect(redacted).not.toContain("10.0.0.1");
    });
  });

  describe("validate()", () => {
    it("should validate clean evidence", async () => {
      const evidence: Evidence = {
        id: "ev-1",
        type: "ci_log",
        content: "CI pipeline executed successfully",
        source: "github-actions",
        timestamp: new Date(),
      };

      const result = await validator.validate(evidence);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.secretsDetected.length).toBe(0);
    });

    it("should reject evidence with secrets", async () => {
      const evidence: Evidence = {
        id: "ev-1",
        type: "ci_log",
        content:
          `Build passed. API_KEY="${TEST_API_KEY}"`,
        source: "github-actions",
        timestamp: new Date(),
      };

      const result = await validator.validate(evidence);
      expect(result.valid).toBe(false);
      expect(result.secretsDetected.length).toBeGreaterThan(0);
    });

    it("should reject evidence without ID", async () => {
      const evidence: Evidence = {
        id: "",
        type: "ci_log",
        content: "Some content",
        source: "github-actions",
        timestamp: new Date(),
      };

      const result = await validator.validate(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Evidence must have an ID");
    });

    it("should reject evidence without content", async () => {
      const evidence: Evidence = {
        id: "ev-1",
        type: "ci_log",
        content: "",
        source: "github-actions",
        timestamp: new Date(),
      };

      const result = await validator.validate(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Evidence content cannot be empty");
    });

    it("should warn on untrusted sources", async () => {
      const evidence: Evidence = {
        id: "ev-1",
        type: "ci_log",
        content: "Build output",
        source: "unknown-service",
        timestamp: new Date(),
      };

      const result = await validator.validate(evidence);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validateForProduction()", () => {
    it("should require CI logs for production", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "test_result",
          content: "All tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.validateForProduction(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("CI logs required for production deployment");
    });

    it("should require test results for production", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.validateForProduction(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Test results required for production deployment");
    });

    it("should require deployment logs for production", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "Tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.validateForProduction(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Deployment logs required for production deployment");
    });

    it("should pass with all required evidence", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "Tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-3",
          type: "deployment_log",
          content: "Deployment successful",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.validateForProduction(evidence);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("should fail if secrets detected", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: `CI passed. Secret: ${TEST_API_KEY}`,
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.validateForProduction(evidence);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Secrets detected"))).toBe(true);
    });
  });

  describe("extractUrls()", () => {
    it("should extract URLs from content", () => {
      const content = "Deployed to https://example.com/app and https://staging.example.com";
      const urls = validator.extractUrls(content);
      expect(urls.length).toBe(2);
      expect(urls).toContain("https://example.com/app");
    });

    it("should remove duplicate URLs", () => {
      const content = "Visit https://example.com and https://example.com again";
      const urls = validator.extractUrls(content);
      expect(urls.length).toBe(1);
    });
  });

  describe("checkCompleteness()", () => {
    it("should check if required evidence is present", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "Tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.checkCompleteness(evidence);
      expect(result.complete).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it("should report missing evidence", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = validator.checkCompleteness(evidence);
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("test_result");
    });

    it("should track optional evidence", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "Tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-3",
          type: "review",
          content: "Code reviewed",
          source: "github",
          timestamp: new Date(),
        },
      ];

      const result = validator.checkCompleteness(evidence);
      expect(result.hasOptional).toContain("review");
    });
  });
});
