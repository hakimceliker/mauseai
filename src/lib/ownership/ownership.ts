import { z } from "zod";

/**
 * Team & ownership (diagram card T): ürün, mühendislik, veri, hukuk, destek
 * sorumlulukları — a RACI matrix per operational area plus decision records.
 */

export type Team = "product" | "engineering" | "data" | "legal" | "support";
export type RaciRole = "R" | "A" | "C" | "I";

export type Area =
  | "strategy"
  | "knowledge"
  | "ingestion"
  | "ai_core"
  | "isolation"
  | "output_quality"
  | "flows"
  | "notifications"
  | "channels"
  | "rollout"
  | "evaluation"
  | "security"
  | "sre_cost"
  | "compliance"
  | "growth";

export const RACI: Record<Area, Record<Team, RaciRole>> = {
  strategy: { product: "A", engineering: "C", data: "C", legal: "I", support: "C" },
  knowledge: { product: "C", engineering: "I", data: "A", legal: "C", support: "R" },
  ingestion: { product: "I", engineering: "R", data: "A", legal: "C", support: "I" },
  ai_core: { product: "C", engineering: "A", data: "R", legal: "I", support: "I" },
  isolation: { product: "I", engineering: "A", data: "C", legal: "C", support: "I" },
  output_quality: { product: "C", engineering: "R", data: "A", legal: "C", support: "I" },
  flows: { product: "A", engineering: "R", data: "C", legal: "I", support: "C" },
  notifications: { product: "C", engineering: "R", data: "I", legal: "I", support: "A" },
  channels: { product: "A", engineering: "R", data: "I", legal: "C", support: "C" },
  rollout: { product: "A", engineering: "R", data: "C", legal: "C", support: "I" },
  evaluation: { product: "C", engineering: "C", data: "A", legal: "I", support: "C" },
  security: { product: "I", engineering: "R", data: "C", legal: "A", support: "I" },
  sre_cost: { product: "C", engineering: "A", data: "I", legal: "I", support: "C" },
  compliance: { product: "C", engineering: "R", data: "C", legal: "A", support: "I" },
  growth: { product: "A", engineering: "C", data: "R", legal: "I", support: "C" },
};

export function validateRaci(matrix: Record<string, Record<Team, RaciRole>> = RACI): string[] {
  const errors: string[] = [];
  for (const [area, row] of Object.entries(matrix)) {
    const accountable = Object.values(row).filter((r) => r === "A").length;
    if (accountable !== 1) errors.push(`${area}: tam olarak bir 'A' olmalı (${accountable})`);
    if (!Object.values(row).some((r) => r === "I" || r === "C")) errors.push(`${area}: bilgilendirilen/danışılan ekip yok`);
  }
  return errors;
}

export function accountableTeam(area: Area): Team {
  return (Object.entries(RACI[area]) as Array<[Team, RaciRole]>).find(([, r]) => r === "A")![0];
}

/** Who acts: the R team, or A when the accountable team also executes. */
export function responsibleTeams(area: Area): Team[] {
  const r = (Object.entries(RACI[area]) as Array<[Team, RaciRole]>).filter(([, role]) => role === "R").map(([t]) => t);
  return r.length ? r : [accountableTeam(area)];
}

export const DecisionRecordSchema = z.object({
  title: z.string().min(5).max(200),
  area: z.enum(Object.keys(RACI) as [Area, ...Area[]]),
  context: z.string().min(10),
  decision: z.string().min(10),
  consequences: z.string().min(5),
  status: z.enum(["proposed", "accepted", "superseded"]).default("proposed"),
  supersedes: z.string().uuid().optional(),
});

export type DecisionRecordInput = z.infer<typeof DecisionRecordSchema>;

const DECISION_TRANSITIONS: Record<string, string[]> = { proposed: ["accepted", "superseded"], accepted: ["superseded"], superseded: [] };

export function canTransitionDecision(from: string, to: string): boolean {
  return DECISION_TRANSITIONS[from]?.includes(to) ?? false;
}
