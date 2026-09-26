import { evaluateGuard, type GuardContext, type GuardDecision, type RateLimiter } from "@/src/lib/isolation/guard";
import { assessOutput, type QualityAssessment } from "@/src/lib/quality/output-quality";
import { draftIncident, scanPromptInjection, shouldBlock, type IncidentDraft } from "@/src/lib/risk/risk-scanner";
import { callWithFallback, CircuitBreaker, decideRoute, defaultProviders, type RoutedProvider } from "./model-routing";
import { buildMessages, selectMemory, type MemoryMessage } from "./prompt-policy";
import { rankChunks, type RetrievableChunk } from "./retrieval";

/**
 * MASUAI CORE pipeline: girdi → bağlam → karar → eylem → kanıt.
 *
 * The diagram's lane-2 flow is executed in this order:
 *   H (prepared chunks) → CORE → I (isolation gate) → J (output quality)
 * and the returned trace is what card K shows as an explainable result.
 */

export interface CoreRequest {
  ctx: GuardContext;
  question: string;
  riskLevel: "L1" | "L2" | "L3" | "L4";
  history?: MemoryMessage[];
  chunks: RetrievableChunk[];
  budget?: { spentCents: number; limitCents: number | null };
}

export interface CoreDeps {
  providers?: RoutedProvider[];
  breaker?: CircuitBreaker;
  limiter?: RateLimiter;
  now?: () => number;
}

export interface TraceStep {
  stage: "input" | "context" | "decision" | "isolation" | "action" | "evidence" | "quality";
  detail: Record<string, unknown>;
}

export type CoreResult =
  | { status: "blocked"; reason: "risk_policy"; incident: IncidentDraft | null; trace: TraceStep[] }
  | { status: "denied"; guard: Exclude<GuardDecision, { allowed: true }>; trace: TraceStep[] }
  | {
      status: "answered" | "escalated";
      quality: QualityAssessment;
      usage: {
        provider: string;
        model: string | null;
        mock: boolean;
        fallbackUsed: boolean;
        estimatedTokens: number;
        /** Provider-reported tokens when available, else the estimate. */
        inputTokens: number;
        outputTokens: number;
        costCents: number;
        latencyMs: number;
      };
      trace: TraceStep[];
    };

const sharedBreaker = new CircuitBreaker();

export async function runCore(request: CoreRequest, deps: CoreDeps = {}): Promise<CoreResult> {
  const trace: TraceStep[] = [];
  const now = deps.now ?? Date.now;
  const providers = deps.providers ?? defaultProviders();

  // Girdi: injection screening before anything reaches a model.
  const findings = scanPromptInjection(request.question);
  trace.push({ stage: "input", detail: { characters: request.question.length, riskFindings: findings.map((f) => f.rule) } });
  if (shouldBlock(findings)) return { status: "blocked", reason: "risk_policy", incident: draftIncident(findings), trace };

  // Bağlam: RAG over the tenant's prepared chunks + bounded memory.
  const context = rankChunks(request.question, request.chunks, { tenantId: request.ctx.tenantId, topK: 5 });
  const memory = selectMemory(request.history ?? []);
  trace.push({
    stage: "context",
    detail: { retrieved: context.map((c) => ({ chunkId: c.id, score: Number(c.score.toFixed(3)) })), memoryKept: memory.kept.length, memoryDropped: memory.dropped },
  });

  // Karar: route by risk and remaining budget.
  const messages = buildMessages({ question: request.question, context, memory: memory.kept });
  const estimatedTokens = Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4) + 256;
  const remaining = request.budget && request.budget.limitCents !== null ? request.budget.limitCents - request.budget.spentCents : null;
  const route = decideRoute(providers, { riskLevel: request.riskLevel, remainingBudgetCents: remaining, estimatedTokens });
  const primary = providers.find((p) => p.provider.name === route.primary)!;
  const estimatedCostCents = Math.max(1, Math.ceil((primary.centsPer1kTokens * estimatedTokens) / 1000));
  trace.push({ stage: "decision", detail: { ...route, estimatedTokens, estimatedCostCents } });

  // CORE → I: the decision is checked against tenant, RBAC, rate and budget limits.
  const guard = await evaluateGuard(request.ctx, { permission: "core.ask", estimatedCostCents, budget: request.budget }, deps.limiter);
  trace.push({ stage: "isolation", detail: guard.allowed ? { allowed: true } : { allowed: false, reason: guard.reason } });
  if (!guard.allowed) return { status: "denied", guard, trace };

  // Eylem: call the model with fallback.
  const started = now();
  const response = await callWithFallback(providers, route, messages, deps.breaker ?? sharedBreaker, now);
  const latencyMs = now() - started;
  trace.push({ stage: "action", detail: { provider: response.provider, mock: response.mock, fallbackUsed: response.fallbackUsed, attempts: response.attempts } });

  // Kanıt: citations for every retrieved source used in the prompt.
  trace.push({ stage: "evidence", detail: { citations: context.map((c) => ({ n: c.citation, documentId: c.documentId, chunkId: c.id })) } });

  // I → J: output quality gate.
  const quality = assessOutput({ rawAnswer: response.content, context, provider: response.provider, mock: response.mock, riskLevel: request.riskLevel });
  trace.push({ stage: "quality", detail: { passed: quality.passed, escalate: quality.escalate, reasons: quality.reasons, confidence: quality.answer.confidence } });

  const entry = providers.find((p) => p.provider.name === response.provider)!;
  const inputTokens = response.usage?.inputTokens ?? estimatedTokens;
  const outputTokens = response.usage?.outputTokens ?? 0;
  const costCents =
    response.usage && entry.costFor
      ? entry.costFor(response.usage)
      : Math.max(1, Math.ceil((entry.centsPer1kTokens * estimatedTokens) / 1000));
  return {
    status: quality.escalate ? "escalated" : "answered",
    quality,
    usage: {
      provider: response.provider,
      model: response.model ?? entry.model ?? null,
      mock: response.mock,
      fallbackUsed: response.fallbackUsed,
      estimatedTokens,
      inputTokens,
      outputTokens,
      costCents,
      latencyMs,
    },
    trace,
  };
}
