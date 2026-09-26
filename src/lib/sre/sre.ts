import { percentile } from "@/src/lib/eval/eval";

/**
 * SRE & cost (diagram card S, edge M→S): gözlemlenebilirlik, SLA,
 * token/altyapı bütçesi, fallback, alarmlar ve kapasite planı.
 */

export interface CallSample {
  latencyMs: number;
  ok: boolean;
  tokens: number;
  costCents: number;
  fallbackUsed: boolean;
  at: string;
}

export interface SloTargets {
  p95LatencyMs: number;
  maxErrorRate: number;
  maxFallbackRate: number;
}

export const DEFAULT_SLO: SloTargets = { p95LatencyMs: 4_000, maxErrorRate: 0.02, maxFallbackRate: 0.2 };

export interface SloReport {
  samples: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  fallbackRate: number;
  tokens: number;
  costCents: number;
  met: boolean | null;
  breaches: string[];
}

export function evaluateSlo(samples: CallSample[], targets: SloTargets = DEFAULT_SLO): SloReport {
  const latencies = samples.map((s) => s.latencyMs);
  const errors = samples.filter((s) => !s.ok).length;
  const fallbacks = samples.filter((s) => s.fallbackUsed).length;
  const report: SloReport = {
    samples: samples.length,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    errorRate: samples.length ? Number((errors / samples.length).toFixed(4)) : 0,
    fallbackRate: samples.length ? Number((fallbacks / samples.length).toFixed(4)) : 0,
    tokens: samples.reduce((s, x) => s + x.tokens, 0),
    costCents: samples.reduce((s, x) => s + x.costCents, 0),
    met: null,
    breaches: [],
  };
  if (!samples.length) return report;
  if (report.p95LatencyMs > targets.p95LatencyMs) report.breaches.push(`p95 ${report.p95LatencyMs}ms > ${targets.p95LatencyMs}ms`);
  if (report.errorRate > targets.maxErrorRate) report.breaches.push(`hata oranı ${report.errorRate} > ${targets.maxErrorRate}`);
  if (report.fallbackRate > targets.maxFallbackRate) report.breaches.push(`fallback oranı ${report.fallbackRate} > ${targets.maxFallbackRate}`);
  report.met = report.breaches.length === 0;
  return report;
}

export interface Alarm {
  rule: string;
  severity: "warning" | "critical";
  message: string;
}

export function evaluateAlarms(input: { slo: SloReport; spentCentsToday: number; dailyBudgetCents: number | null }): Alarm[] {
  const alarms: Alarm[] = input.slo.breaches.map((b) => ({ rule: "slo_breach", severity: "warning" as const, message: b }));
  if (input.slo.errorRate >= 0.1) alarms.push({ rule: "error_spike", severity: "critical", message: `hata oranı ${input.slo.errorRate}` });
  if (input.dailyBudgetCents !== null) {
    const used = input.spentCentsToday / Math.max(1, input.dailyBudgetCents);
    if (used >= 1) alarms.push({ rule: "budget_exhausted", severity: "critical", message: "günlük token bütçesi tükendi" });
    else if (used >= 0.8) alarms.push({ rule: "budget_80", severity: "warning", message: `günlük bütçenin %${Math.round(used * 100)}'i kullanıldı` });
  }
  return alarms;
}

/** Little's law: concurrency = arrival rate × latency, with headroom. */
export function capacityPlan(input: { peakRequestsPerMinute: number; p95LatencyMs: number; headroom?: number; perWorkerConcurrency?: number }) {
  const headroom = input.headroom ?? 1.5;
  const perWorker = input.perWorkerConcurrency ?? 10;
  const concurrency = (input.peakRequestsPerMinute / 60) * (input.p95LatencyMs / 1000) * headroom;
  return { requiredConcurrency: Math.ceil(concurrency), workers: Math.max(1, Math.ceil(concurrency / perWorker)) };
}
