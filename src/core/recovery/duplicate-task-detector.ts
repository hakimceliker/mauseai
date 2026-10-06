import { createHash } from "node:crypto";

export interface DuplicateTaskCandidate {
  tenantId: string;
  goal: string;
  input?: unknown;
}

/** Deterministic idempotency boundary for task submission. */
export class DuplicateTaskDetector {
  private readonly seen = new Set<string>();

  fingerprint(candidate: DuplicateTaskCandidate): string {
    return createHash("sha256")
      .update(JSON.stringify({
        tenantId: candidate.tenantId,
        goal: candidate.goal.trim(),
        input: candidate.input ?? null,
      }))
      .digest("hex");
  }

  register(candidate: DuplicateTaskCandidate): { duplicate: boolean; fingerprint: string } {
    const fingerprint = this.fingerprint(candidate);
    const duplicate = this.seen.has(fingerprint);
    this.seen.add(fingerprint);
    return { duplicate, fingerprint };
  }
}

