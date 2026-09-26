import { describe, expect, it } from "vitest";
import { advanceBlueprint, newBlueprint, type Blueprint } from "@/src/lib/blueprint/blueprint";
import { computeKpis, KPI_CATALOG, kpiProgress } from "@/src/lib/kpi/kpi";
import { expandQuery, freshness, KnowledgeSourceSchema } from "@/src/lib/knowledge/knowledge";
import { labelFeedback, requiresHumanApproval } from "@/src/lib/feedback/feedback";
import { channelStatus, CHANNELS, InboundMessageSchema, isChannelAvailable, listChannels, resolveIdentity } from "@/src/lib/channels/channels";

/** Lane 1 — A…F and the channel/identity part of O. */

const A = { targetUsers: ["destek ekibi"], problem: "Müşteri sorularına geç yanıt veriliyor", valueProposition: "Politikalara dayalı hızlı yanıt", successDefinition: "Yanıt süresi yarıya iner" };
const B = {
  roles: ["destek"],
  useCases: [{ id: "iade-sorusu", title: "İade sorusu", role: "destek", priority: "must", acceptanceCriteria: ["Kaynak gösterilir"] }],
};
const C = { assignments: [{ useCaseId: "iade-sorusu", channels: ["web", "api"] }] };
const D = { sources: [{ name: "İade politikası", kind: "policy", owner: "hukuk", reviewIntervalDays: 90, useCaseIds: ["iade-sorusu"] }], glossary: [] };
const E = { kpis: [{ key: "accuracy", useCaseIds: ["iade-sorusu"], baseline: 0.6, target: 0.9 }, { key: "satisfaction", useCaseIds: ["iade-sorusu"], baseline: 3, target: 4.5 }] };
const F = { labels: ["correct", "rated"], humanApprovalPoints: [{ useCaseId: "iade-sorusu", trigger: "risk_l3_or_higher" }] };

function through(stage: "A" | "B" | "C" | "D" | "E"): Blueprint {
  let bp = newBlueprint("Destek");
  const inputs = { A, B, C, D, E } as const;
  for (const s of ["A", "B", "C", "D", "E"] as const) {
    const r = advanceBlueprint(bp, s, inputs[s]);
    if (!r.ok) throw new Error(r.errors.join("; "));
    bp = r.blueprint;
    if (s === stage) break;
  }
  return bp;
}

describe("A → F blueprint", () => {
  it("A (Amaç): validates purpose and moves to B", () => {
    const r = advanceBlueprint(newBlueprint("x"), "A", A);
    expect(r.ok && r.blueprint.currentStage).toBe("B");
    expect(advanceBlueprint(newBlueprint("x"), "A", { ...A, problem: "kısa" }).ok).toBe(false);
  });

  it("A → B: B is refused before A is complete", () => {
    const r = advanceBlueprint(newBlueprint("x"), "B", B);
    expect(r).toMatchObject({ ok: false });
  });

  it("B (Brief): every use case role must be a declared role", () => {
    const bp = through("A");
    const r = advanceBlueprint(bp, "B", { ...B, useCases: [{ ...B.useCases[0], role: "satış" }] });
    expect(r.ok).toBe(false);
  });

  it("B → C: every use case needs a channel, and only known channels are accepted", () => {
    const bp = through("B");
    expect(advanceBlueprint(bp, "C", { assignments: [{ useCaseId: "baska", channels: ["web"] }] }).ok).toBe(false);
    expect(advanceBlueprint(bp, "C", { assignments: [{ useCaseId: "iade-sorusu", channels: ["fax"] }] }).ok).toBe(false);
    expect(advanceBlueprint(bp, "C", C).ok).toBe(true);
  });

  it("C → D: every channelled use case needs a knowledge source with an owner", () => {
    const bp = through("C");
    expect(advanceBlueprint(bp, "D", { sources: [{ ...D.sources[0], useCaseIds: ["yok"] }] }).ok).toBe(false);
    expect(advanceBlueprint(bp, "D", D).ok).toBe(true);
  });

  it("D → E: an accuracy KPI is mandatory for knowledge-based use cases", () => {
    const bp = through("D");
    expect(advanceBlueprint(bp, "E", { kpis: [{ key: "cost", useCaseIds: ["iade-sorusu"], baseline: 5, target: 3 }] }).ok).toBe(false);
    expect(advanceBlueprint(bp, "E", E).ok).toBe(true);
  });

  it("E → F: KPIs require their feedback labels; completing F finishes the blueprint", () => {
    const bp = through("E");
    expect(advanceBlueprint(bp, "F", { ...F, labels: ["rated"] }).ok).toBe(false);
    const r = advanceBlueprint(bp, "F", F);
    expect(r.ok && r.blueprint.currentStage).toBe("complete");
  });

  it("re-submitting an earlier stage invalidates later stages", () => {
    const bp = through("E");
    const r = advanceBlueprint(bp, "B", B);
    expect(r.ok && r.blueprint.currentStage).toBe("C");
    expect(r.ok && r.blueprint.stages.C).toBeUndefined();
  });
});

describe("C / O — channels and single identity", () => {
  it("web and API are available, mobile is planned, external channels need credentials", () => {
    const env = {};
    expect(isChannelAvailable("web", env)).toBe(true);
    expect(isChannelAvailable("api", env)).toBe(true);
    expect(channelStatus(CHANNELS.find((c) => c.id === "mobile")!, env).status).toBe("planned");
    for (const id of ["email", "slack", "teams", "crm"]) expect(listChannels(env).find((c) => c.id === id)?.status).toBe("requires_credentials");
    expect(isChannelAvailable("teams", { TEAMS_WEBHOOK_URL: "https://example.invalid" })).toBe(true);
  });

  it("resolves the same context key for a user on any channel, and never across tenants", () => {
    const ids = [
      { tenantId: "t1", userId: "u1", channel: "api" as const, externalUserId: "ext-1" },
      { tenantId: "t1", userId: "u1", channel: "slack" as const, externalUserId: "U123" },
    ];
    const viaApi = resolveIdentity(InboundMessageSchema.parse({ channel: "api", externalUserId: "ext-1", text: "merhaba" }), "t1", ids);
    const viaSlack = resolveIdentity(InboundMessageSchema.parse({ channel: "slack", externalUserId: "U123", text: "devam" }), "t1", ids);
    expect(viaApi?.contextKey).toBe("t1:u1");
    expect(viaSlack?.contextKey).toBe(viaApi?.contextKey);
    expect(resolveIdentity(InboundMessageSchema.parse({ channel: "api", externalUserId: "ext-1", text: "x" }), "t2", ids)).toBeNull();
  });
});

describe("D — domain knowledge", () => {
  it("flags sources past their review interval and requires an owner", () => {
    const now = new Date("2026-09-26T00:00:00Z");
    expect(freshness({ reviewIntervalDays: 30, lastReviewedAt: "2026-07-01T00:00:00Z" }, now)).toMatchObject({ stale: true });
    expect(freshness({ reviewIntervalDays: 30, lastReviewedAt: "2026-09-20T00:00:00Z" }, now).stale).toBe(false);
    expect(freshness({ reviewIntervalDays: 30 }, now).stale).toBe(true);
    expect(KnowledgeSourceSchema.safeParse({ name: "x", kind: "policy", reviewIntervalDays: 30 }).success).toBe(false);
  });

  it("expands queries with glossary synonyms", () => {
    const q = expandQuery("İade ne kadar sürer?", [{ term: "iade", definition: "Ürünün geri gönderilmesi", synonyms: ["geri gönderim"] }]);
    expect(q).toContain("geri gönderim");
    expect(expandQuery("kargo", [{ term: "iade", definition: "x yz", synonyms: [] }])).toBe("kargo");
  });
});

describe("E — KPI", () => {
  it("computes each KPI only from recorded events", () => {
    const values = computeKpis({
      tasks: [
        { status: "completed", manualMinutesEstimate: 30, actualMinutes: 10, costCents: 4 },
        { status: "completed", manualMinutesEstimate: null, actualMinutes: null, costCents: 6 },
        { status: "failed", costCents: 2 },
      ],
      feedback: [{ label: "correct" }, { label: "incorrect" }, { rating: 4, label: "rated" }, { rating: 2, label: "rated" }],
      flows: [{ status: "completed" }, { status: "failed" }],
    });
    const by = Object.fromEntries(values.map((v) => [v.key, v]));
    expect(KPI_CATALOG.map((k) => k.key).every((k) => k in by)).toBe(true);
    expect(by.time_saved.value).toBe(20);
    expect(by.accuracy.value).toBe(0.5);
    expect(by.satisfaction.value).toBe(3);
    expect(by.conversion.value).toBe(0.5);
    expect(by.accuracy.sampleSize).toBe(2);
  });

  it("returns null (not a guess) when nothing was measured", () => {
    const values = computeKpis({ tasks: [], feedback: [], flows: [] });
    expect(values.every((v) => v.value === null)).toBe(true);
    expect(kpiProgress(KPI_CATALOG[1], null, 0.6, 0.9)).toBeNull();
    expect(kpiProgress(KPI_CATALOG[4], 4, 6, 2)).toBeCloseTo(0.5);
  });
});

describe("F — feedback loop", () => {
  it("labels by rule, masks PII and queues by priority", () => {
    expect(labelFeedback({ targetType: "answer", targetId: "a", comment: "Bu yanıt zararlı" })).toMatchObject({ label: "unsafe", labelSource: "rule", queue: { priority: "p1" } });
    expect(labelFeedback({ targetType: "answer", targetId: "a", comment: "Tamamen yanlış" }).queue.priority).toBe("p2");
    expect(labelFeedback({ targetType: "answer", targetId: "a", rating: 1 }).queue.priority).toBe("p3");
    expect(labelFeedback({ targetType: "answer", targetId: "a", rating: 5 }).queue.enqueue).toBe(false);
    expect(labelFeedback({ targetType: "answer", targetId: "a", comment: "mail: ali@example.com" }).comment).not.toContain("ali@example.com");
  });

  it("human approval points fire on risk, publishing, deletion and budget", () => {
    expect(requiresHumanApproval({ riskLevel: "L3" })).toEqual(["risk_l3_or_higher"]);
    expect(requiresHumanApproval({ externalPublish: true, dataDeletion: true, overBudget: true })).toHaveLength(3);
    expect(requiresHumanApproval({ confidence: 0.2 })).toEqual([]);
    expect(requiresHumanApproval({ confidence: 0.2 }, ["low_confidence"])).toEqual(["low_confidence"]);
  });
});
