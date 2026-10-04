/**
 * Evidence Gate Tests
 * B8 Phase - Testing evidence validation framework
 */

import { EvidenceGate } from "../evidence-gate";
import { Evidence } from "../../judge/types";

describe("EvidenceGate", () => {
  let gate: EvidenceGate;

  beforeEach(() => {
    gate = new EvidenceGate();
  });

  describe("validate()", () => {
    it("should pass with sufficient valid evidence", async () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed successfully",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "All tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = await gate.validate(evidence);
      expect(result.passed).toBe(true);
      expect(result.validEvidence).toBeGreaterThanOrEqual(2);
    });

    it("should fail with insufficient evidence", async () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = await gate.validate(evidence);
      expect(result.validEvidence).toBe(1);
    });

    it("should fail if evidence contains secrets", async () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: 'CI passed. Secret: sk_live_51HqLIFAnPaKwVHrW3K6ZD4X9Y2W1E3R5T7U9Q2S4V6X8Z0A"',
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

      const result = await gate.validate(evidence);
      expect(result.invalidEvidence).toBeGreaterThan(0);
      expect(
        result.evidenceDetails.some((d) => d.secretsDetected.length > 0)
      ).toBe(true);
    });

    it("should track evidence details", async () => {
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

      const result = await gate.validate(evidence);
      expect(result.evidenceDetails.length).toBe(2);
      expect(result.evidenceDetails[0].evidenceId).toBe("ev-1");
      expect(result.evidenceDetails[0].type).toBe("ci_log");
    });

    it("should generate summary", async () => {
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

      const result = await gate.validate(evidence);
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it("should generate recommendations for missing evidence", async () => {
      const evidence: Evidence[] = [];

      const result = await gate.validate(evidence);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.includes("evidence"))).toBe(
        true
      );
    });

    it("should recommend redaction for secrets", async () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: 'Password: sk_live_51HqLIFAnPaKwVHrW3K6ZD4X9Y2W1E3R5T7U9Q2S4V6X8Z0A"',
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = await gate.validate(evidence);
      expect(
        result.recommendations.some((r) => r.includes("redact"))
      ).toBe(true);
    });
  });

  describe("validateBatch()", () => {
    it("should validate multiple evidence batches", async () => {
      const batch1: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const batch2: Evidence[] = [
        {
          id: "ev-2",
          type: "test_result",
          content: "Tests passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const results = await gate.validateBatch([batch1, batch2]);
      expect(results.length).toBe(2);
      expect(results[0].totalEvidence).toBe(1);
      expect(results[1].totalEvidence).toBe(1);
    });
  });

  describe("redactAll()", () => {
    it("should redact all evidence", async () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "Email: user@example.com",
          source: "github-actions",
          timestamp: new Date(),
        },
        {
          id: "ev-2",
          type: "test_result",
          content: "IP: 192.168.1.1",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const redacted = await gate.redactAll(evidence);
      expect(redacted[0].content).not.toContain("@");
      expect(redacted[1].content).not.toContain("192.168");
      expect(redacted[0].isRedacted).toBe(true);
    });
  });

  describe("checkCompleteness()", () => {
    it("should check completeness for deployment tasks", () => {
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
          content: "Deployed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = gate.checkCompleteness(evidence, "deployment");
      expect(result.complete).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it("should identify missing evidence for security tasks", () => {
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: "CI passed",
          source: "github-actions",
          timestamp: new Date(),
        },
      ];

      const result = gate.checkCompleteness(evidence, "security");
      expect(result.complete).toBe(false);
      expect(result.missing).toContain("test_result");
    });
  });

  describe("configuration", () => {
    it("should allow configuration updates", () => {
      gate.configure({
        requireMinimumEvidence: 5,
        failOnSecrets: false,
      });

      const config = gate.getConfig();
      expect(config.requireMinimumEvidence).toBe(5);
      expect(config.failOnSecrets).toBe(false);
    });

    it("should create production gate", () => {
      const prodGate = EvidenceGate.createProductionGate();
      const config = prodGate.getConfig();
      expect(config.requireMinimumEvidence).toBeGreaterThanOrEqual(3);
      expect(config.redactSensitiveData).toBe(true);
      expect(config.failOnSecrets).toBe(true);
    });

    it("should create development gate", () => {
      const devGate = EvidenceGate.createDevelopmentGate();
      const config = devGate.getConfig();
      expect(config.requireMinimumEvidence).toBe(1);
      expect(config.failOnSecrets).toBe(false);
    });

    it("should create security gate", () => {
      const secGate = EvidenceGate.createSecurityGate();
      const config = secGate.getConfig();
      expect(config.requireMinimumEvidence).toBeGreaterThanOrEqual(2);
      expect(config.failOnSecrets).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty evidence array", async () => {
      const result = await gate.validate([]);
      expect(result.passed).toBe(false);
      expect(result.totalEvidence).toBe(0);
      expect(result.validEvidence).toBe(0);
    });

    it("should handle evidence with missing fields", async () => {
      const evidence: Evidence[] = [
        {
          id: "",
          type: "ci_log",
          content: "",
          source: "",
          timestamp: new Date(),
        },
      ];

      const result = await gate.validate(evidence);
      expect(result.invalidEvidence).toBeGreaterThan(0);
    });

    it("should handle very large evidence content", async () => {
      const largeContent = "A".repeat(1000000); // 1MB of content
      const evidence: Evidence[] = [
        {
          id: "ev-1",
          type: "ci_log",
          content: largeContent,
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

      const result = await gate.validate(evidence);
      expect(result.validEvidence).toBeGreaterThanOrEqual(1);
    });
  });
});
