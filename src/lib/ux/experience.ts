import type { CoreResult } from "@/src/lib/core/orchestrator";

/**
 * User experience (diagram card K, edge CORE→K): hızlı başlangıç, arama,
 * sohbet, açıklanabilir sonuç, kişisel alan + ekip alanı.
 */

export type Visibility = "personal" | "team";

/** Personal items are visible to their creator only; team items to every tenant member. */
export function isVisible(item: { visibility: Visibility; createdBy: string | null }, userId: string): boolean {
  return item.visibility === "team" || item.createdBy === userId;
}

export interface Explanation {
  status: string;
  answer: string | null;
  mock: boolean;
  confidence: number | null;
  needsHumanReview: boolean;
  sources: Array<{ n: number; documentId: string; chunkId: string }>;
  steps: string[];
}

const STAGE_LABELS: Record<string, string> = {
  input: "Girdi güvenlik taramasından geçti",
  context: "İlgili kaynaklar bulundu",
  decision: "Model seçildi",
  isolation: "Yetki ve bütçe kontrol edildi",
  action: "Model çağrıldı",
  evidence: "Kaynaklar eşleştirildi",
  quality: "Çıktı kalite kontrolünden geçti",
};

export function explainResult(result: CoreResult): Explanation {
  const steps = result.trace.map((t) => {
    const label = STAGE_LABELS[t.stage] ?? t.stage;
    if (t.stage === "context") return `${label} (${(t.detail.retrieved as unknown[]).length} parça)`;
    if (t.stage === "decision") return `${label}: ${String(t.detail.primary)} — ${String(t.detail.reason)}`;
    if (t.stage === "isolation" && t.detail.allowed === false) return `Yetki kontrolü reddetti: ${String(t.detail.reason)}`;
    return label;
  });
  if (result.status === "blocked")
    return { status: result.status, answer: null, mock: false, confidence: null, needsHumanReview: true, sources: [], steps: [...steps, "Güvenlik politikası isteği durdurdu"] };
  if (result.status === "denied")
    return { status: result.status, answer: null, mock: false, confidence: null, needsHumanReview: false, sources: [], steps };
  const { answer } = result.quality;
  return {
    status: result.status,
    answer: answer.answer,
    mock: answer.mock,
    confidence: answer.confidence,
    needsHumanReview: result.quality.escalate,
    sources: answer.citations.map((c) => ({ n: c.citation, documentId: c.documentId, chunkId: c.chunkId })),
    steps,
  };
}

export interface QuickstartState {
  hasBlueprint: boolean;
  hasKnowledgeSource: boolean;
  hasDocument: boolean;
  hasAskedQuestion: boolean;
  hasFlowRun: boolean;
}

export function quickstartChecklist(state: QuickstartState) {
  const items = [
    { key: "blueprint", label: "Kullanım senaryosu planını (A–F) doldur", done: state.hasBlueprint, href: "/api/blueprints" },
    { key: "knowledge", label: "Bir bilgi kaynağı ve sahibini tanımla", done: state.hasKnowledgeSource, href: "/api/knowledge" },
    { key: "document", label: "İlk dokümanı yükle", done: state.hasDocument, href: "/api/ingest" },
    { key: "ask", label: "Kaynaklara dayalı ilk soruyu sor", done: state.hasAskedQuestion, href: "/api/core/ask" },
    { key: "flow", label: "Bir akış şablonunu çalıştır", done: state.hasFlowRun, href: "/api/flows/runs" },
  ];
  return { items, completed: items.filter((i) => i.done).length, total: items.length };
}
