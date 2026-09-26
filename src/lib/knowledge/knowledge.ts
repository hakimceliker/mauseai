import { z } from "zod";

/**
 * Domain knowledge (diagram card D): sözlük, süreçler, politika, kaynak
 * sahipleri ve güncellik.
 */

export const KnowledgeSourceSchema = z.object({
  name: z.string().min(2).max(200),
  kind: z.enum(["glossary", "process", "policy", "document"]),
  owner: z.string().min(2).max(200),
  reviewIntervalDays: z.number().int().min(1).max(365),
  lastReviewedAt: z.string().datetime().optional(),
  description: z.string().max(2_000).optional(),
});

export type KnowledgeSourceInput = z.infer<typeof KnowledgeSourceSchema>;

export const GlossaryTermSchema = z.object({
  term: z.string().min(1).max(120),
  definition: z.string().min(3).max(2_000),
  synonyms: z.array(z.string().min(1).max(120)).max(20).default([]),
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

export interface FreshnessInfo {
  stale: boolean;
  dueAt: string | null;
  daysOverdue: number;
}

export function freshness(source: { reviewIntervalDays: number; lastReviewedAt?: string | null }, now = new Date()): FreshnessInfo {
  if (!source.lastReviewedAt) return { stale: true, dueAt: null, daysOverdue: 0 };
  const due = new Date(new Date(source.lastReviewedAt).getTime() + source.reviewIntervalDays * 86_400_000);
  const overdueMs = now.getTime() - due.getTime();
  return { stale: overdueMs > 0, dueAt: due.toISOString(), daysOverdue: overdueMs > 0 ? Math.floor(overdueMs / 86_400_000) : 0 };
}

/** Adds glossary synonyms to a query so domain vocabulary matches during retrieval. */
export function expandQuery(query: string, glossary: GlossaryTerm[]): string {
  const lower = query.toLocaleLowerCase("tr-TR");
  const additions = new Set<string>();
  for (const entry of glossary) {
    const variants = [entry.term, ...entry.synonyms];
    if (variants.some((v) => lower.includes(v.toLocaleLowerCase("tr-TR"))))
      variants.forEach((v) => additions.add(v));
  }
  return additions.size ? `${query} ${[...additions].join(" ")}` : query;
}
