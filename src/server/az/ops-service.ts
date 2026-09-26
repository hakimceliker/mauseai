import { runCore, type CoreDeps } from "@/src/lib/core/orchestrator";
import { detectRegression, GoldenCaseSchema, scoreCase, summarizeRun, type RunSummary } from "@/src/lib/eval/eval";
import { capacityPlan, evaluateAlarms, evaluateSlo, type CallSample } from "@/src/lib/sre/sre";
import { gateCheck, type GateEvidence } from "@/src/lib/rollout/rollout";
import { computeKpis } from "@/src/lib/kpi/kpi";
import { retentionCohorts } from "@/src/lib/growth/growth";
import type { Role } from "@/src/lib/isolation/guard";
import { check, type Db } from "./records";
import { loadVisibleChunks } from "./core-service";

/**
 * Lane 4 services: Q (eval runs), S (SLO/alarms/capacity), P gate evidence,
 * E (KPI values) and Y (retention) — all computed from recorded rows.
 */

export async function runEvaluation(db: Db, input: { tenantId: string; userId: string; role: Role; label: string }, deps: CoreDeps = {}) {
  const cases = (check(await db.from("eval_cases").select("key,input,expected").eq("tenant_id", input.tenantId).eq("active", true), "eval_cases_load_failed") as unknown[]).map(
    (c) => GoldenCaseSchema.parse(c),
  );
  const chunks = await loadVisibleChunks(db, input.tenantId, input.userId);
  const scores = [];
  for (const testCase of cases) {
    const result = await runCore({ ctx: { tenantId: input.tenantId, userId: input.userId, role: input.role }, question: testCase.input, riskLevel: "L1", chunks }, deps);
    if (result.status === "blocked" || result.status === "denied") {
      scores.push({ key: testCase.key, passed: false, failures: [result.status], latencyMs: 0 });
      continue;
    }
    scores.push(scoreCase(testCase, { answer: result.quality.answer.answer, citations: result.quality.answer.citations.length, latencyMs: result.usage.latencyMs }));
  }
  const ratings = check(await db.from("feedback").select("rating").eq("tenant_id", input.tenantId).eq("target_type", "answer"), "ratings_load_failed") as Array<{ rating: number | null }>;
  const summary = summarizeRun(scores, ratings.filter((r) => typeof r.rating === "number").map((r) => r.rating as number));

  const previous = await db.from("eval_runs").select("*").eq("tenant_id", input.tenantId).order("created_at", { ascending: false }).limit(1);
  const baselineRow = ((previous.data ?? []) as Array<{ id: string; total: number; passed: number; accuracy: number; p95_latency_ms: number; usefulness: number | null; scores: RunSummary["scores"] }>)[0];
  const regression = baselineRow
    ? detectRegression(
        { total: baselineRow.total, passed: baselineRow.passed, accuracy: Number(baselineRow.accuracy), p95LatencyMs: baselineRow.p95_latency_ms, usefulness: baselineRow.usefulness, scores: baselineRow.scores },
        summary,
      )
    : { regression: false, newlyFailing: [], accuracyDelta: 0 };

  const run = check(
    await db
      .from("eval_runs")
      .insert({
        tenant_id: input.tenantId,
        label: input.label,
        total: summary.total,
        passed: summary.passed,
        accuracy: summary.accuracy,
        p95_latency_ms: summary.p95LatencyMs,
        usefulness: summary.usefulness,
        regression: regression.regression,
        baseline_run_id: baselineRow?.id ?? null,
        scores: summary.scores,
        created_by: input.userId,
      })
      .select("*")
      .single(),
    "eval_run_create_failed",
  ) as { id: string };
  return { runId: run.id, summary, regression };
}

export async function sloStatus(db: Db, tenantId: string, now = new Date()) {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const calls = check(
    await db.from("model_calls").select("latency_ms,ok,tokens,cost_cents,fallback_used,created_at").eq("tenant_id", tenantId).gte("created_at", since).limit(10_000),
    "model_calls_load_failed",
  ) as Array<{ latency_ms: number; ok: boolean; tokens: number; cost_cents: number; fallback_used: boolean; created_at: string }>;
  const samples: CallSample[] = calls.map((c) => ({ latencyMs: c.latency_ms, ok: c.ok, tokens: c.tokens, costCents: c.cost_cents, fallbackUsed: c.fallback_used, at: c.created_at }));
  const slo = evaluateSlo(samples);
  const tenant = await db.from("tenants").select("monthly_limit").eq("id", tenantId).maybeSingle();
  const monthly = tenant.data?.monthly_limit;
  const dailyBudgetCents = monthly === null || monthly === undefined ? null : Math.round((Number(monthly) * 100) / 30);
  const alarms = evaluateAlarms({ slo, spentCentsToday: slo.costCents, dailyBudgetCents });
  const perMinute = samples.length / (24 * 60);
  return { slo, alarms, dailyBudgetCents, capacity: capacityPlan({ peakRequestsPerMinute: Math.max(1, Math.ceil(perMinute * 4)), p95LatencyMs: slo.p95LatencyMs || 1 }) };
}

export async function gateEvidence(db: Db, tenantId: string): Promise<GateEvidence> {
  const latest = await db.from("eval_runs").select("accuracy,regression").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1);
  const run = ((latest.data ?? []) as Array<{ accuracy: number; regression: boolean }>)[0];
  const incidents = check(await db.from("risk_incidents").select("id,severity").eq("tenant_id", tenantId).eq("status", "open"), "incidents_load_failed") as Array<{ severity: string }>;
  const { slo } = await sloStatus(db, tenantId);
  return {
    evalAccuracy: run ? Number(run.accuracy) : null,
    evalRegression: run ? run.regression : false,
    openHighRiskIncidents: incidents.filter((i) => i.severity === "high" || i.severity === "critical").length,
    sloMet: slo.met,
  };
}

export async function gateReport(db: Db, tenantId: string) {
  const evidence = await gateEvidence(db, tenantId);
  return { evidence, ...gateCheck(evidence) };
}

export async function kpiValues(db: Db, tenantId: string) {
  const [tasks, feedback, flows] = await Promise.all([
    db.from("tasks").select("status,spent_cents,metadata").eq("tenant_id", tenantId).limit(10_000),
    db.from("feedback").select("rating,label").eq("tenant_id", tenantId).limit(10_000),
    db.from("flow_runs").select("status").eq("tenant_id", tenantId).limit(10_000),
  ]);
  const taskRows = (tasks.data ?? []) as Array<{ status: string; spent_cents: number | null; metadata: Record<string, unknown> | null }>;
  return computeKpis({
    tasks: taskRows.map((t) => ({
      status: t.status,
      costCents: t.spent_cents,
      manualMinutesEstimate: typeof t.metadata?.manualMinutesEstimate === "number" ? (t.metadata.manualMinutesEstimate as number) : null,
      actualMinutes: typeof t.metadata?.actualMinutes === "number" ? (t.metadata.actualMinutes as number) : null,
    })),
    feedback: (feedback.data ?? []) as Array<{ rating: number | null; label: string | null }>,
    flows: (flows.data ?? []) as Array<{ status: string }>,
  });
}

export async function retention(db: Db, tenantId: string, now = new Date()) {
  const rows = check(
    await db.from("model_calls").select("user_id,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: true }).limit(20_000),
    "activity_load_failed",
  ) as Array<{ user_id: string | null; created_at: string }>;
  const activity = rows.filter((r) => r.user_id).map((r) => ({ userId: r.user_id as string, at: r.created_at }));
  const firstSeen = new Map<string, string>();
  for (const a of activity) if (!firstSeen.has(a.userId)) firstSeen.set(a.userId, a.at);
  return retentionCohorts([...firstSeen.entries()].map(([userId, first]) => ({ userId, firstSeen: first })), activity, [1, 7, 30], now);
}
