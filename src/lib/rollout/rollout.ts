import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Pilot → Production (diagram card P, edge P→V–Z): küçük grupta dene →
 * güvenlik/kalite kapıları → kademeli yaygınlaştır, with an owner, rollback
 * plan and runbook required for every flow.
 */

export const ROLLOUT_STAGES = ["pilot", "beta", "ga"] as const;
export type RolloutStage = (typeof ROLLOUT_STAGES)[number] | "rolled_back";

export const STAGE_PERCENT: Record<RolloutStage, number> = { pilot: 5, beta: 25, ga: 100, rolled_back: 0 };

export const RolloutSchema = z.object({
  featureKey: z.string().regex(/^[a-z0-9._-]{3,80}$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  owner: z.string().min(2).max(200),
  rollbackPlan: z.string().min(10),
  runbookUrl: z.string().url().or(z.string().regex(/^(docs|RUNBOOK)[\w./-]*\.md$/)),
  allowlist: z.array(z.string()).max(1_000).default([]),
});

export type RolloutInput = z.infer<typeof RolloutSchema>;

export interface GateEvidence {
  evalAccuracy: number | null;
  evalRegression: boolean;
  openHighRiskIncidents: number;
  sloMet: boolean | null;
}

export const GATE_THRESHOLDS = { minEvalAccuracy: 0.8 };

export function gateCheck(evidence: GateEvidence): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (evidence.evalAccuracy === null) failures.push("kalite: değerlendirme çalıştırılmamış");
  else if (evidence.evalAccuracy < GATE_THRESHOLDS.minEvalAccuracy)
    failures.push(`kalite: doğruluk ${evidence.evalAccuracy} < ${GATE_THRESHOLDS.minEvalAccuracy}`);
  if (evidence.evalRegression) failures.push("kalite: regresyon tespit edildi");
  if (evidence.openHighRiskIncidents > 0) failures.push(`güvenlik: ${evidence.openHighRiskIncidents} açık yüksek riskli olay`);
  if (evidence.sloMet === null) failures.push("sre: SLO verisi yok");
  else if (!evidence.sloMet) failures.push("sre: SLO karşılanmıyor");
  return { passed: failures.length === 0, failures };
}

export function nextStage(stage: RolloutStage): RolloutStage | null {
  if (stage === "rolled_back") return null;
  const i = ROLLOUT_STAGES.indexOf(stage);
  return i + 1 < ROLLOUT_STAGES.length ? ROLLOUT_STAGES[i + 1] : null;
}

export function advanceRollout(stage: RolloutStage, evidence: GateEvidence): { ok: true; stage: RolloutStage } | { ok: false; failures: string[] } {
  const next = nextStage(stage);
  if (!next) return { ok: false, failures: [`'${stage}' aşamasından ilerlenemez`] };
  const gate = gateCheck(evidence);
  return gate.passed ? { ok: true, stage: next } : { ok: false, failures: gate.failures };
}

/** Deterministic 0–99 bucket so a subject stays in (or out of) a cohort across requests. */
export function bucket(featureKey: string, subject: string): number {
  const digest = createHash("sha256").update(`${featureKey}:${subject}`).digest();
  return digest.readUInt32BE(0) % 100;
}

export function isEnabledFor(rollout: { featureKey: string; stage: RolloutStage; allowlist: string[] }, subject: string): boolean {
  if (rollout.stage === "rolled_back") return false;
  if (rollout.allowlist.includes(subject)) return true;
  return bucket(rollout.featureKey, subject) < STAGE_PERCENT[rollout.stage];
}
