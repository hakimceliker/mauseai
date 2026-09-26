import { FlowTemplateSchema, validateTemplate, type FlowTemplate } from "@/src/lib/flows/flows";
import type { GoldenCase } from "@/src/lib/eval/eval";

/**
 * Rollout & growth (diagram card V–Z): V versiyonla · W workflow'ları çoğalt ·
 * X deneyleri ölç (see eval.compareProportions) · Y kullanıcıyı elde tut ·
 * Z sürekli öğren.
 */

/* V — versioning */
export type ChangeKind = "breaking" | "feature" | "fix";

export function bumpVersion(version: string, change: ChangeKind): string {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error("invalid_semver");
  const [major, minor, patch] = match.slice(1).map(Number);
  if (change === "breaking") return `${major + 1}.0.0`;
  if (change === "feature") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function changeKindBetween(previous: FlowTemplate, next: FlowTemplate): ChangeKind {
  const prevIds = previous.steps.map((s) => `${s.id}:${s.kind}`);
  const nextIds = next.steps.map((s) => `${s.id}:${s.kind}`);
  if (prevIds.some((id) => !nextIds.includes(id))) return "breaking";
  if (nextIds.length > prevIds.length) return "feature";
  return "fix";
}

/* W — replicate a workflow template under a new key */
export function cloneTemplate(source: FlowTemplate, newKey: string, newName?: string): FlowTemplate {
  const clone = FlowTemplateSchema.parse({
    ...structuredClone(source),
    key: newKey,
    name: newName ?? `${source.name} (kopya)`,
    version: "1.0.0",
  });
  const errors = validateTemplate(clone);
  if (errors.length) throw new Error(`invalid_template:${errors.join("; ")}`);
  return clone;
}

/* Y — retention cohorts */
export function retentionCohorts(
  users: Array<{ userId: string; firstSeen: string }>,
  activity: Array<{ userId: string; at: string }>,
  days: number[] = [1, 7, 30],
  now = new Date(),
): Array<{ day: number; eligible: number; retained: number; rate: number | null }> {
  return days.map((day) => {
    const eligible = users.filter((u) => now.getTime() - new Date(u.firstSeen).getTime() >= day * 86_400_000);
    const retained = eligible.filter((u) => {
      const start = new Date(u.firstSeen).getTime() + day * 86_400_000;
      return activity.some((a) => a.userId === u.userId && new Date(a.at).getTime() >= start && new Date(a.at).getTime() < start + 86_400_000);
    });
    return { day, eligible: eligible.length, retained: retained.length, rate: eligible.length ? Number((retained.length / eligible.length).toFixed(4)) : null };
  });
}

/* Z — continuous learning: incorrect answers become golden-set candidates (F → Q). */
export function goldenCaseFromFeedback(feedback: { id: string; label: string; question: string | null; comment: string | null }): GoldenCase | null {
  if (feedback.label !== "incorrect" || !feedback.question) return null;
  return {
    key: `fb-${feedback.id.slice(0, 8)}`,
    input: feedback.question,
    expected: { mustContain: [], mustNotContain: [], requireCitation: true },
  };
}
