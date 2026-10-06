import type { Evidence } from "@/src/core/task-engine/task-engine";

/**
 * In-memory append-only evidence boundary used by the runtime and tests.
 * Evidence deletion is deliberately not exposed; production persistence must
 * provide the same invariant and is separately verified in Phase C-E.
 */
export class AppendOnlyEvidenceStore {
  private readonly records = new Map<string, Evidence[]>();

  append(taskId: string, evidence: Evidence): void {
    const current = this.records.get(taskId) ?? [];
    this.records.set(taskId, [...current, { ...evidence }]);
  }

  list(taskId: string): Evidence[] {
    return (this.records.get(taskId) ?? []).map((evidence) => ({ ...evidence }));
  }

  has(taskId: string, evidenceId: string): boolean {
    return this.list(taskId).some((evidence) => evidence.id === evidenceId);
  }
}

