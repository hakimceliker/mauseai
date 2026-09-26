/**
 * Impact & KPI (diagram card E): zaman tasarrufu, doğruluk, dönüşüm,
 * memnuniyet, maliyet — computed from recorded events, never estimated.
 */

export type KpiKey = "time_saved" | "accuracy" | "conversion" | "satisfaction" | "cost";

export interface KpiDefinition {
  key: KpiKey;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  /** Feedback label that must exist for the KPI to be measurable (card F). */
  feedbackLabel?: string;
}

export const KPI_CATALOG: KpiDefinition[] = [
  { key: "time_saved", label: "Zaman tasarrufu", unit: "dakika", higherIsBetter: true },
  { key: "accuracy", label: "Doğruluk", unit: "oran", higherIsBetter: true, feedbackLabel: "correct" },
  { key: "conversion", label: "Dönüşüm", unit: "oran", higherIsBetter: true },
  { key: "satisfaction", label: "Memnuniyet", unit: "puan (1-5)", higherIsBetter: true, feedbackLabel: "rated" },
  { key: "cost", label: "Birim maliyet", unit: "cent/görev", higherIsBetter: false },
];

export interface KpiInputs {
  tasks: Array<{ status: string; manualMinutesEstimate?: number | null; actualMinutes?: number | null; costCents?: number | null }>;
  feedback: Array<{ rating?: number | null; label?: string | null }>;
  flows: Array<{ status: string }>;
}

export interface KpiValue {
  key: KpiKey;
  value: number | null;
  sampleSize: number;
}

const round = (n: number) => Number(n.toFixed(4));

export function computeKpis(inputs: KpiInputs): KpiValue[] {
  const completed = inputs.tasks.filter((t) => t.status === "completed");
  const timed = completed.filter((t) => t.manualMinutesEstimate != null && t.actualMinutes != null);
  const labelled = inputs.feedback.filter((f) => f.label === "correct" || f.label === "incorrect");
  const rated = inputs.feedback.filter((f) => typeof f.rating === "number");
  const finishedFlows = inputs.flows.filter((f) => ["completed", "failed", "cancelled"].includes(f.status));
  const costed = completed.filter((t) => typeof t.costCents === "number");

  return [
    {
      key: "time_saved",
      value: timed.length ? round(timed.reduce((s, t) => s + (t.manualMinutesEstimate! - t.actualMinutes!), 0)) : null,
      sampleSize: timed.length,
    },
    {
      key: "accuracy",
      value: labelled.length ? round(labelled.filter((f) => f.label === "correct").length / labelled.length) : null,
      sampleSize: labelled.length,
    },
    {
      key: "conversion",
      value: finishedFlows.length ? round(finishedFlows.filter((f) => f.status === "completed").length / finishedFlows.length) : null,
      sampleSize: finishedFlows.length,
    },
    {
      key: "satisfaction",
      value: rated.length ? round(rated.reduce((s, f) => s + (f.rating as number), 0) / rated.length) : null,
      sampleSize: rated.length,
    },
    {
      key: "cost",
      value: costed.length ? round(costed.reduce((s, t) => s + (t.costCents as number), 0) / costed.length) : null,
      sampleSize: costed.length,
    },
  ];
}

export function kpiProgress(def: KpiDefinition, value: number | null, baseline: number, target: number): number | null {
  if (value === null || target === baseline) return null;
  const progress = (value - baseline) / (target - baseline);
  return round(Math.max(0, Math.min(1, progress)));
}
