import { z } from "zod";
import { CHANNELS } from "@/src/lib/channels/channels";
import { KPI_CATALOG, type KpiKey } from "@/src/lib/kpi/kpi";

/**
 * Use-case blueprint: lane 1 of the diagram as an ordered state machine
 * A (Amaç) → B (Brief) → C (Channels) → D (Domain) → E (KPI) → F (Feedback).
 * Each stage is validated against the previous one, which is what the lane's
 * arrows mean in code: a stage cannot be completed without its input.
 */

export const BLUEPRINT_STAGES = ["A", "B", "C", "D", "E", "F"] as const;
export type BlueprintStage = (typeof BLUEPRINT_STAGES)[number];

const channelIds = CHANNELS.map((c) => c.id) as [string, ...string[]];
const kpiKeys = KPI_CATALOG.map((k) => k.key) as [KpiKey, ...KpiKey[]];

export const PurposeSchema = z.object({
  targetUsers: z.array(z.string().min(2)).min(1),
  problem: z.string().min(10),
  valueProposition: z.string().min(10),
  successDefinition: z.string().min(10),
});

export const BriefSchema = z.object({
  roles: z.array(z.string().min(2)).min(1),
  useCases: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{2,40}$/),
        title: z.string().min(3),
        role: z.string().min(2),
        priority: z.enum(["must", "should", "could"]),
        acceptanceCriteria: z.array(z.string().min(5)).min(1),
      }),
    )
    .min(1),
});

export const ChannelPlanSchema = z.object({
  assignments: z.array(z.object({ useCaseId: z.string(), channels: z.array(z.enum(channelIds)).min(1) })).min(1),
});

export const DomainPlanSchema = z.object({
  sources: z
    .array(
      z.object({
        name: z.string().min(2),
        kind: z.enum(["glossary", "process", "policy", "document"]),
        owner: z.string().min(2),
        reviewIntervalDays: z.number().int().min(1).max(365),
        useCaseIds: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  glossary: z.array(z.object({ term: z.string().min(1), definition: z.string().min(3), synonyms: z.array(z.string()).default([]) })).default([]),
});

export const KpiPlanSchema = z.object({
  kpis: z
    .array(
      z.object({
        key: z.enum(kpiKeys),
        useCaseIds: z.array(z.string()).min(1),
        baseline: z.number().nonnegative(),
        target: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export const FeedbackPlanSchema = z.object({
  labels: z.array(z.string().regex(/^[a-z_]{3,40}$/)).min(1),
  humanApprovalPoints: z
    .array(
      z.object({
        useCaseId: z.string(),
        trigger: z.enum(["risk_l3_or_higher", "low_confidence", "external_publish", "data_deletion", "cost_over_budget"]),
      }),
    )
    .min(1),
});

export const STAGE_SCHEMAS = {
  A: PurposeSchema,
  B: BriefSchema,
  C: ChannelPlanSchema,
  D: DomainPlanSchema,
  E: KpiPlanSchema,
  F: FeedbackPlanSchema,
} as const;

export type BlueprintData = {
  A?: z.infer<typeof PurposeSchema>;
  B?: z.infer<typeof BriefSchema>;
  C?: z.infer<typeof ChannelPlanSchema>;
  D?: z.infer<typeof DomainPlanSchema>;
  E?: z.infer<typeof KpiPlanSchema>;
  F?: z.infer<typeof FeedbackPlanSchema>;
};

export interface Blueprint {
  name: string;
  stages: BlueprintData;
  currentStage: BlueprintStage | "complete";
}

export function newBlueprint(name: string): Blueprint {
  return { name, stages: {}, currentStage: "A" };
}

export type AdvanceResult = { ok: true; blueprint: Blueprint } | { ok: false; errors: string[] };

function crossStageErrors(stage: BlueprintStage, data: BlueprintData): string[] {
  const errors: string[] = [];
  const useCaseIds = new Set(data.B?.useCases.map((u) => u.id) ?? []);
  const unknown = (ids: string[], where: string) =>
    ids.filter((id) => !useCaseIds.has(id)).forEach((id) => errors.push(`${where}: bilinmeyen kullanım senaryosu '${id}'`));

  if (stage === "B") {
    for (const u of data.B!.useCases)
      if (!data.B!.roles.includes(u.role)) errors.push(`B: '${u.id}' senaryosunun rolü '${u.role}' rol listesinde yok`);
  }
  if (stage === "C") {
    const covered = new Set(data.C!.assignments.map((a) => a.useCaseId));
    unknown([...covered], "C");
    for (const id of useCaseIds) if (!covered.has(id)) errors.push(`C: '${id}' senaryosu için kanal seçilmedi`);
  }
  if (stage === "D") {
    const covered = new Set(data.D!.sources.flatMap((s) => s.useCaseIds));
    unknown([...covered], "D");
    for (const a of data.C!.assignments)
      if (!covered.has(a.useCaseId)) errors.push(`D: '${a.useCaseId}' senaryosunun kanalı için bilgi kaynağı bağlanmadı`);
  }
  if (stage === "E") {
    unknown(data.E!.kpis.flatMap((k) => k.useCaseIds), "E");
    if (!data.E!.kpis.some((k) => k.key === "accuracy"))
      errors.push("E: bilgi tabanına dayanan senaryolar için 'accuracy' KPI'ı zorunlu");
  }
  if (stage === "F") {
    unknown(data.F!.humanApprovalPoints.map((p) => p.useCaseId), "F");
    for (const kpi of data.E!.kpis) {
      const def = KPI_CATALOG.find((k) => k.key === kpi.key)!;
      if (def.feedbackLabel && !data.F!.labels.includes(def.feedbackLabel))
        errors.push(`F: '${kpi.key}' KPI'ı için '${def.feedbackLabel}' geri bildirim etiketi tanımlanmalı`);
    }
  }
  return errors;
}

export function advanceBlueprint(blueprint: Blueprint, stage: BlueprintStage, input: unknown): AdvanceResult {
  const index = BLUEPRINT_STAGES.indexOf(stage);
  const currentIndex = blueprint.currentStage === "complete" ? BLUEPRINT_STAGES.length : BLUEPRINT_STAGES.indexOf(blueprint.currentStage);
  if (index > currentIndex) return { ok: false, errors: [`${stage}: önce ${BLUEPRINT_STAGES[currentIndex]} aşaması tamamlanmalı`] };

  const parsed = STAGE_SCHEMAS[stage].safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${stage}.${i.path.join(".")}: ${i.message}`) };

  // Re-submitting an earlier stage invalidates everything after it.
  const stages: BlueprintData = {};
  for (const s of BLUEPRINT_STAGES.slice(0, index)) (stages as Record<string, unknown>)[s] = blueprint.stages[s];
  (stages as Record<string, unknown>)[stage] = parsed.data;

  const errors = crossStageErrors(stage, stages);
  if (errors.length) return { ok: false, errors };
  const next = index + 1 < BLUEPRINT_STAGES.length ? BLUEPRINT_STAGES[index + 1] : "complete";
  return { ok: true, blueprint: { ...blueprint, stages, currentStage: next } };
}
