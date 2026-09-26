import { z } from "zod";
import { scanDataLeak, type RiskFinding } from "@/src/lib/risk/risk-scanner";
import type { RetrievedChunk } from "@/src/lib/core/retrieval";

/**
 * Generative output quality gate (diagram card J): citations, structured
 * output, guardrails and escalation to a human when confidence is low.
 */

export const StructuredAnswerSchema = z.object({
  answer: z.string().min(1),
  citations: z.array(
    z.object({ citation: z.number().int().positive(), documentId: z.string().min(1), chunkId: z.string().min(1) }),
  ),
  confidence: z.number().min(0).max(1),
  mock: z.boolean(),
  provider: z.string().min(1),
});

export type StructuredAnswer = z.infer<typeof StructuredAnswerSchema>;

export const CONFIDENCE_ESCALATION_THRESHOLD = 0.45;

export interface QualityAssessment {
  passed: boolean;
  escalate: boolean;
  reasons: string[];
  guardrailFindings: RiskFinding[];
  answer: StructuredAnswer;
}

/** Confidence from retrieval strength and coverage; a mock answer is capped so it always gets a human look. */
export function estimateConfidence(context: RetrievedChunk[], mock: boolean): number {
  if (!context.length) return 0.1;
  const top = context[0].score;
  const strength = Math.min(1, top / 6);
  const coverage = Math.min(1, context.length / 3);
  const value = 0.25 + 0.5 * strength + 0.25 * coverage;
  return Number(Math.min(mock ? 0.6 : 1, value).toFixed(3));
}

export function assessOutput(input: {
  rawAnswer: string;
  context: RetrievedChunk[];
  provider: string;
  mock: boolean;
  riskLevel: string;
}): QualityAssessment {
  const reasons: string[] = [];
  const guardrailFindings = scanDataLeak(input.rawAnswer);
  const blocking = guardrailFindings.filter((f) => f.severity === "high" || f.severity === "critical");
  const answerText = blocking.length ? "Yanıt güvenlik kontrolünden geçmedi ve gizlendi." : input.rawAnswer;
  if (blocking.length) reasons.push("guardrail_blocked_output");

  const citations = input.context.map((c) => ({ citation: c.citation, documentId: c.documentId, chunkId: c.id }));
  if (!citations.length) reasons.push("no_supporting_sources");

  const confidence = estimateConfidence(input.context, input.mock);
  if (confidence < CONFIDENCE_ESCALATION_THRESHOLD) reasons.push("low_confidence");
  if (input.riskLevel === "L4") reasons.push("risk_l4_requires_human");

  const answer: StructuredAnswer = {
    answer: answerText,
    citations,
    confidence,
    mock: input.mock,
    provider: input.provider,
  };
  const schema = StructuredAnswerSchema.safeParse(answer);
  if (!schema.success) reasons.push("structured_output_invalid");

  const passed = schema.success && !blocking.length;
  const escalate = !passed || reasons.some((r) => r !== "guardrail_blocked_output");
  return { passed, escalate, reasons, guardrailFindings, answer };
}
