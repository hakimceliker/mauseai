import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const manifestPath = resolve(process.cwd(), "senatech.project.yaml");

describe("Senatech project manifest", () => {
  const manifest = readFileSync(manifestPath, "utf8");

  it("declares GitHub as canonical source and the required runtime chain", () => {
    expect(manifest).toContain('source_of_truth: "github"');
    expect(manifest).toContain('canonical_ci: "github_actions"');
    expect(manifest).toContain('secondary_ci_and_backup: "gitlab"');
    expect(manifest).toContain('disaster_recovery_mirror: "forgejo_read_only"');
    expect(manifest).toContain('local_runtime: "Windows/Docker"');
    expect(manifest).toContain('local_model: "Ollama/Qwen"');
  });

  it("requires the governance ownership, evidence, and approval fields", () => {
    for (const field of [
      "project_owner: null",
      "technical_owner: null",
      "decision_owner: null",
      "data_class: null",
      "risk_level: null",
      "real_e2e_evidence: required",
      "secrets_out_of_source_and_logs: required",
      "missing_information_decision: \"BLOCKED\"",
    ]) {
      expect(manifest).toContain(field);
    }
  });

  it("fails closed until control-plane and acceptance gates are satisfied", () => {
    expect(manifest).toContain('status: "BLOCKED"');
    expect(manifest).toContain("control_plane:");
    expect(manifest).toContain("identity: required");
    expect(manifest).toContain("tenant: required");
    expect(manifest).toContain("capability: required");
    expect(manifest).toContain("validator: required");
    expect(manifest).toContain("audit: required");
    expect(manifest).toContain('validator: "independent_review_and_judge"');
    expect(manifest).toContain("evidence_required: true");
    expect(manifest).toContain("production_ready: false");
    for (const approval of [
      "high_risk",
      "critical_risk",
      "financial_action",
      "deletion",
      "external_communication",
      "production_deployment",
      "dns_change",
      "permission_change",
    ]) {
      expect(manifest).toContain(`    - ${approval}`);
    }
  });

  it("does not contain credential-shaped values", () => {
    expect(manifest).not.toMatch(/(?:sk_live|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|service_role)/);
  });
});
