import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Quality & evaluation (diagram card Q, edge K→Q): altın veri seti,
 * regresyon, insan değerlendirmesi, A/B — doğruluk · fayda · gecikme.
 */

export const GoldenCaseSchema = z.object({
  key: z.string().regex(/^[a-z0-9._-]{2,80}$/),
  input: z.string().min(2).max(5_000),
  expected: z.object({
    mustContain: z.array(z.string().min(1)).default([]),
    mustNotContain: z.array(z.string().min(1)).default([]),
    requireCitation: z.boolean().default(false),
  }),
});

export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export interface CaseOutput {
  answer: string;
  citations: number;
  latencyMs: number;
}

export interface CaseScore {
  key: string;
  passed: boolean;
  failures: string[];
  latencyMs: number;
}

export function scoreCase(testCase: GoldenCase, output: CaseOutput): CaseScore {
  const text = output.answer.toLocaleLowerCase("tr-TR");
  const failures: string[] = [];
  for (const needle of testCase.expected.mustContain)
    if (!text.includes(needle.toLocaleLowerCase("tr-TR"))) failures.push(`eksik: "${needle}"`);
  for (const needle of testCase.expected.mustNotContain)
    if (text.includes(needle.toLocaleLowerCase("tr-TR"))) failures.push(`yasak: "${needle}"`);
  if (testCase.expected.requireCitation && output.citations === 0) failures.push("kaynak gösterilmedi");
  return { key: testCase.key, passed: failures.length === 0, failures, latencyMs: output.latencyMs };
}

export interface RunSummary {
  total: number;
  passed: number;
  accuracy: number;
  p95LatencyMs: number;
  usefulness: number | null;
  scores: CaseScore[];
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

/** Usefulness = mean human rating (1–5) normalised to 0–1; null when nobody rated. */
export function summarizeRun(scores: CaseScore[], humanRatings: number[] = []): RunSummary {
  const passed = scores.filter((s) => s.passed).length;
  return {
    total: scores.length,
    passed,
    accuracy: scores.length ? Number((passed / scores.length).toFixed(4)) : 0,
    p95LatencyMs: percentile(scores.map((s) => s.latencyMs), 95),
    usefulness: humanRatings.length ? Number(((humanRatings.reduce((a, b) => a + b, 0) / humanRatings.length - 1) / 4).toFixed(4)) : null,
    scores,
  };
}

export const REGRESSION_TOLERANCE = 0.05;

export function detectRegression(baseline: RunSummary, candidate: RunSummary): { regression: boolean; newlyFailing: string[]; accuracyDelta: number } {
  const baselinePassing = new Set(baseline.scores.filter((s) => s.passed).map((s) => s.key));
  const newlyFailing = candidate.scores.filter((s) => !s.passed && baselinePassing.has(s.key)).map((s) => s.key);
  const accuracyDelta = Number((candidate.accuracy - baseline.accuracy).toFixed(4));
  return { regression: newlyFailing.length > 0 || accuracyDelta < -REGRESSION_TOLERANCE, newlyFailing, accuracyDelta };
}

/* ---------------- A/B ---------------- */

export function assignVariant(experimentKey: string, subject: string, variants: string[] = ["control", "treatment"]): string {
  const n = createHash("sha256").update(`${experimentKey}|${subject}`).digest().readUInt32BE(0);
  return variants[n % variants.length];
}

function normalCdf(z: number): number {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Two-proportion z-test (two-sided). */
export function compareProportions(control: { successes: number; trials: number }, treatment: { successes: number; trials: number }) {
  if (!control.trials || !treatment.trials) return { lift: null, z: null, pValue: null, significant: false };
  const p1 = control.successes / control.trials;
  const p2 = treatment.successes / treatment.trials;
  const pooled = (control.successes + treatment.successes) / (control.trials + treatment.trials);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.trials + 1 / treatment.trials));
  if (se === 0) return { lift: p2 - p1, z: 0, pValue: 1, significant: false };
  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { lift: Number((p2 - p1).toFixed(4)), z: Number(z.toFixed(4)), pValue: Number(pValue.toFixed(4)), significant: pValue < 0.05 };
}
