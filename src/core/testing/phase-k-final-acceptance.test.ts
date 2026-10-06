import { describe, expect, it } from "vitest";
import { Phase_K_Closure, type Phase_K_ClosureGate } from "./phase-k-final-acceptance";

describe("Phase K final acceptance gate", () => {
  it("remains closed when live requirements and sign-offs are missing", () => {
    const current: Phase_K_ClosureGate = {
      name: "Phase K - Final Acceptance",
      totalRequirements: 20,
      closedRequirements: 0,
      allClosed: false,
      blockers: [
        { phase: "C", status: "BLOCKED", reason: "Live Auth/RLS evidence missing" },
        { phase: "J", status: "PARTIAL", reason: "20 red-team scenarios remain blocked" },
      ],
      signoffs: [],
    };

    expect(Phase_K_Closure.canClose(current)).toBe(false);
    expect(Phase_K_Closure.getBlockers(current)).toEqual(expect.arrayContaining([
      "C: Live Auth/RLS evidence missing",
      "J: 20 red-team scenarios remain blocked",
      "Approval required: Architect",
      "Approval required: CTO",
      "Approval required: CEO",
    ]));
  });

  it("does not treat complete technical checks as a substitute for required sign-offs", () => {
    const unsigned: Phase_K_ClosureGate = {
      name: "Phase K - Final Acceptance",
      totalRequirements: 20,
      closedRequirements: 20,
      allClosed: true,
      blockers: [],
      signoffs: [],
    };

    expect(Phase_K_Closure.canClose(unsigned)).toBe(false);
  });
});
