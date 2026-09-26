import { z } from "zod";
import { maskPii } from "@/src/lib/preparation/pii";

/**
 * Feedback loop (diagram card F): kullanıcı geri bildirimi → etiketleme →
 * iyileştirme kuyruğu, and the human-approval points defined up front.
 */

export const FeedbackInputSchema = z.object({
  targetType: z.enum(["answer", "task", "flow_run"]),
  targetId: z.string().min(1).max(255),
  rating: z.number().int().min(1).max(5).optional(),
  label: z.enum(["correct", "incorrect", "unhelpful", "unsafe", "rated"]).optional(),
  comment: z.string().max(4_000).optional(),
});

export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

export type ImprovementPriority = "p1" | "p2" | "p3";

export interface LabelledFeedback {
  targetType: FeedbackInput["targetType"];
  targetId: string;
  rating: number | null;
  label: string;
  comment: string | null;
  labelSource: "user" | "rule";
  queue: { enqueue: boolean; priority: ImprovementPriority | null; reason: string | null };
}

// JS \b treats Turkish letters (ı, ş, ğ…) as non-word characters, so boundaries are Unicode letter lookarounds.
const UNSAFE_WORDS = /(?<!\p{L})(tehlikeli|zararlı|kişisel veri|gizli|unsafe|harmful|leak)(?!\p{L})/iu;
const WRONG_WORDS = /(?<!\p{L})(yanlış|hatalı|uydurma|doğru değil|wrong|incorrect|hallucinat)/iu;

export function labelFeedback(input: FeedbackInput): LabelledFeedback {
  const comment = input.comment ? maskPii(input.comment).text : null;
  let label = input.label ?? null;
  let labelSource: LabelledFeedback["labelSource"] = "user";
  if (!label) {
    labelSource = "rule";
    if (comment && UNSAFE_WORDS.test(comment)) label = "unsafe";
    else if (comment && WRONG_WORDS.test(comment)) label = "incorrect";
    else if (input.rating !== undefined && input.rating <= 2) label = "unhelpful";
    else if (input.rating !== undefined) label = "rated";
    else label = "unhelpful";
  }

  let queue: LabelledFeedback["queue"] = { enqueue: false, priority: null, reason: null };
  if (label === "unsafe") queue = { enqueue: true, priority: "p1", reason: "güvenlik bildirimi" };
  else if (label === "incorrect") queue = { enqueue: true, priority: "p2", reason: "yanlış yanıt — altın veri setine aday" };
  else if (label === "unhelpful" && (input.rating ?? 5) <= 2) queue = { enqueue: true, priority: "p3", reason: "düşük memnuniyet" };

  return { targetType: input.targetType, targetId: input.targetId, rating: input.rating ?? null, label, comment, labelSource, queue };
}

export type ApprovalTrigger = "risk_l3_or_higher" | "low_confidence" | "external_publish" | "data_deletion" | "cost_over_budget";

/** Default human-approval points; blueprints (stage F) can add use-case specific ones. */
export const DEFAULT_APPROVAL_TRIGGERS: ApprovalTrigger[] = ["risk_l3_or_higher", "external_publish", "data_deletion", "cost_over_budget"];

export function requiresHumanApproval(
  facts: { riskLevel?: string; confidence?: number; externalPublish?: boolean; dataDeletion?: boolean; overBudget?: boolean },
  triggers: ApprovalTrigger[] = DEFAULT_APPROVAL_TRIGGERS,
  confidenceThreshold = 0.45,
): ApprovalTrigger[] {
  const hit: ApprovalTrigger[] = [];
  if (triggers.includes("risk_l3_or_higher") && (facts.riskLevel === "L3" || facts.riskLevel === "L4")) hit.push("risk_l3_or_higher");
  if (triggers.includes("low_confidence") && facts.confidence !== undefined && facts.confidence < confidenceThreshold) hit.push("low_confidence");
  if (triggers.includes("external_publish") && facts.externalPublish) hit.push("external_publish");
  if (triggers.includes("data_deletion") && facts.dataDeletion) hit.push("data_deletion");
  if (triggers.includes("cost_over_budget") && facts.overBudget) hit.push("cost_over_budget");
  return hit;
}
