import { DIAGRAM_EDGES, DIAGRAM_NODES } from "./inventory";

/**
 * Coverage matrix: every card capability and every connector of the official
 * A–Z diagram mapped to the code that implements it and the test that proves
 * it. tests/diagram/coverage.test.ts fails if an item is missing, a path does
 * not exist, or docs/diagrams/A-Z-COVERAGE.md is out of date.
 *
 * Status is deliberately conservative:
 * - implemented: code path + automated test exist in this repo.
 * - partial: implemented with a documented limitation (e.g. mock providers).
 * - requires_credentials: code path exists and reports itself as unavailable
 *   until an external account/key is configured; nothing is faked.
 */

export type CoverageStatus = "implemented" | "partial" | "requires_credentials";

export interface CoverageItem {
  id: string;
  status: CoverageStatus;
  code: string[];
  tests: string[];
  note?: string;
}

export interface NodeCoverage {
  node: string;
  capabilities: Array<CoverageItem & { capability: string }>;
}

const T = {
  svg: "tests/diagram/svg-inventory.test.ts",
  strategy: "tests/az/strategy.test.ts",
  dataCore: "tests/az/data-core.test.ts",
  product: "tests/az/product.test.ts",
  ops: "tests/az/ops.test.ts",
  rls: "tests/db/az-rls.test.ts",
  services: "tests/db/az-services.test.ts",
  routes: "tests/api/az-routes.test.ts",
  ai: "tests/integrations/ai-providers.test.ts",
  rate: "tests/integrations/rate-limit.test.ts",
  notify: "tests/integrations/notifications.test.ts",
  crm: "tests/integrations/crm.test.ts",
  delivery: "tests/db/az-delivery-crm.test.ts",
  config: "tests/config/production-checks.test.ts",
  ui: "tests/ui/diagram-ui.test.tsx",
} as const;

const M = {
  platform: "supabase/migrations/0004_a_z_platform.sql",
  reconcile: "supabase/migrations/0003_schema_reconciliation.sql",
  pipelines: "src/inngest/functions/a-z-pipelines.ts",
  delivery: "supabase/migrations/0005_delivery_and_crm.sql",
} as const;

const AI = ["src/lib/ai/provider-registry.ts", "src/lib/ai/providers/openai.ts", "src/lib/ai/providers/anthropic.ts", "src/lib/core/model-routing.ts"];
const SEND = ["src/lib/notifications/senders.ts", "src/server/az/notification-dispatch.ts", M.delivery];

type Cap = [capability: string, status: CoverageStatus, code: string[], tests: string[], note?: string];

const node = (id: string, caps: Cap[]): NodeCoverage => ({
  node: id,
  capabilities: caps.map(([capability, status, code, tests, note], i) => ({
    id: `${id}#${i + 1}`,
    capability,
    status,
    code,
    tests,
    ...(note ? { note } : {}),
  })),
});

const BP = ["src/lib/blueprint/blueprint.ts", "app/api/blueprints/[id]/stages/[stage]/route.ts", M.platform];

export const NODE_COVERAGE: NodeCoverage[] = [
  node("A", [
    ["Hedef kullanıcı", "implemented", BP, [T.strategy, T.routes]],
    ["Ana problem", "implemented", BP, [T.strategy]],
    ["Değer önerisi", "implemented", BP, [T.strategy]],
    ["Başarı tanımı", "implemented", BP, [T.strategy]],
  ]),
  node("B", [
    ["Kullanım senaryoları", "implemented", BP, [T.strategy]],
    ["Roller", "implemented", [...BP, "src/lib/isolation/guard.ts"], [T.strategy]],
    ["Öncelikler", "implemented", BP, [T.strategy]],
    ["Kabul kriterleri", "implemented", BP, [T.strategy]],
  ]),
  node("C", [
    ["Web", "implemented", ["src/lib/channels/channels.ts", "app/api/channels/inbound/route.ts"], [T.strategy, T.services]],
    ["Mobil", "partial", ["src/lib/channels/channels.ts", "app/diagram/diagram-explorer.tsx", "app/globals.css"], [T.strategy, T.ui], "Web arayüzü telefon ve tablette çalışır (duyarlı, dokunmatik hedefler); yerel mobil istemci yok, kanal 'planned'."],
    ["API", "implemented", ["src/lib/channels/channels.ts", "app/api/channels/inbound/route.ts"], [T.strategy, T.services]],
    ["E-posta", "requires_credentials", [...SEND, "src/lib/channels/channels.ts"], [T.notify, T.delivery], "Resend adapter'ı, retry ve teslim kaydı hazır; EMAIL_PROVIDER_KEY + EMAIL_FROM olmadan teslimat channel_not_configured."],
    ["Slack/Teams", "requires_credentials", [...SEND, "src/lib/channels/signatures.ts", "app/api/channels/slack/events/route.ts", "app/api/channels/teams/messages/route.ts"], [T.notify, T.delivery, T.routes], "Webhook gönderimi ve imza doğrulaması hazır; SLACK_WEBHOOK_URL, SLACK_SIGNING_SECRET, TEAMS_WEBHOOK_URL, TEAMS_OUTGOING_WEBHOOK_SECRET gerekir."],
    ["CRM yüzeyleri", "requires_credentials", ["src/lib/crm/crm-adapter.ts", "src/server/az/crm-service.ts", "app/api/crm/contacts/route.ts", M.delivery], [T.crm, T.delivery, T.routes], "HubSpot adapter'ı (tenant izolasyonu, timeout/retry, audit) hazır; CRM_API_KEY olmadan 503 crm_not_configured."],
  ]),
  node("D", [
    ["Sözlük", "implemented", ["src/lib/knowledge/knowledge.ts", "app/api/knowledge/glossary/route.ts", M.platform], [T.strategy, T.rls]],
    ["Süreçler", "implemented", ["src/lib/knowledge/knowledge.ts", "app/api/knowledge/route.ts"], [T.strategy]],
    ["Politika", "implemented", ["src/lib/knowledge/knowledge.ts", "src/lib/core/prompt-policy.ts"], [T.strategy, T.dataCore]],
    ["Kaynak sahipleri", "implemented", ["src/lib/knowledge/knowledge.ts", M.platform], [T.strategy]],
    ["Güncellik", "implemented", ["src/lib/knowledge/knowledge.ts"], [T.strategy]],
  ]),
  node("E", [
    ["Zaman tasarrufu", "implemented", ["src/lib/kpi/kpi.ts", "app/api/kpi/route.ts", "src/server/az/ops-service.ts"], [T.strategy]],
    ["Doğruluk", "implemented", ["src/lib/kpi/kpi.ts"], [T.strategy]],
    ["Dönüşüm", "implemented", ["src/lib/kpi/kpi.ts"], [T.strategy]],
    ["Memnuniyet", "implemented", ["src/lib/kpi/kpi.ts"], [T.strategy]],
    ["Maliyet", "implemented", ["src/lib/kpi/kpi.ts", M.reconcile], [T.strategy]],
  ]),
  node("F", [
    ["Kullanıcı geri bildirimi", "implemented", ["src/lib/feedback/feedback.ts", "app/api/feedback/route.ts", "src/server/az/pipeline-service.ts"], [T.strategy, T.services, T.routes]],
    ["Etiketleme", "implemented", ["src/lib/feedback/feedback.ts", M.pipelines], [T.strategy, T.services]],
    ["İyileştirme kuyruğu", "implemented", ["src/lib/feedback/feedback.ts", "src/server/az/pipeline-service.ts"], [T.strategy, T.services]],
    ["İnsan onayı gereken noktalar", "implemented", ["src/lib/feedback/feedback.ts", "app/api/approvals/[id]/route.ts"], [T.strategy, T.services]],
  ]),
  node("G", [
    ["Dosya", "implemented", ["src/lib/ingestion/ingestion.ts", "app/api/ingest/route.ts"], [T.dataCore, T.services]],
    ["API", "implemented", ["app/api/ingest/route.ts"], [T.services, T.routes]],
    ["Webhook", "implemented", ["src/lib/ingestion/ingestion.ts", "app/api/ingest/webhook/[sourceId]/route.ts"], [T.dataCore, T.routes], "HMAC imzası INGEST_WEBHOOK_SECRET ile; secret yoksa 503 secret_not_configured."],
    ["Doküman", "implemented", ["src/server/az/pipeline-service.ts", M.platform], [T.services]],
    ["Olay akışı", "implemented", ["src/lib/ingestion/ingestion.ts", M.pipelines], [T.dataCore, T.services]],
    ["Şema + versiyon + sahiplik", "implemented", ["src/lib/ingestion/ingestion.ts", "app/api/ingest/sources/route.ts", M.platform], [T.dataCore, T.rls]],
  ]),
  node("H", [
    ["Temizleme", "implemented", ["src/lib/preparation/prepare.ts"], [T.dataCore]],
    ["Parçalama", "implemented", ["src/lib/preparation/prepare.ts", "src/server/az/pipeline-service.ts"], [T.dataCore, T.services]],
    ["PII maskeleme", "implemented", ["src/lib/preparation/pii.ts"], [T.dataCore]],
    ["Metadata", "implemented", ["src/lib/preparation/prepare.ts", M.platform], [T.dataCore]],
    ["Kalite kapıları", "implemented", ["src/lib/preparation/prepare.ts"], [T.dataCore]],
    ["İzlenebilirlik", "implemented", ["src/lib/preparation/prepare.ts", M.platform], [T.dataCore, T.services]],
  ]),
  node("CORE", [
    ["Model yönlendirme", "requires_credentials", AI, [T.ai, T.dataCore, T.routes], "OpenAI ve Anthropic adapter'ları (resmi SDK, timeout/retry) hazır; production'da anahtar yoksa 503 ai_provider_not_configured, mock yalnızca test/development."],
    ["RAG", "implemented", ["src/lib/core/retrieval.ts", "src/server/az/core-service.ts"], [T.dataCore, T.services]],
    ["Araç çağrısı", "implemented", ["src/lib/core/tools.ts", "app/api/tools/[name]/route.ts"], [T.dataCore, T.routes]],
    ["Prompt politikası", "implemented", ["src/lib/core/prompt-policy.ts"], [T.dataCore]],
    ["Hafıza", "implemented", ["src/lib/core/prompt-policy.ts", "src/lib/channels/channels.ts"], [T.dataCore]],
    ["Orkestrasyon", "implemented", ["src/lib/core/orchestrator.ts", "app/api/core/ask/route.ts"], [T.dataCore, T.services]],
    ["Girdi → bağlam → karar → eylem → kanıt", "implemented", ["src/lib/core/orchestrator.ts"], [T.dataCore]],
  ]),
  node("I", [
    ["Tenant sınırları", "implemented", ["src/lib/isolation/guard.ts", M.reconcile, M.platform], [T.dataCore, T.rls]],
    ["RBAC", "implemented", ["src/lib/isolation/guard.ts", "src/server/http/tenant-route.ts"], [T.dataCore, T.routes]],
    ["Oran limitleri", "requires_credentials", ["src/lib/isolation/guard.ts", "src/lib/ratelimit/distributed.ts"], [T.rate, T.dataCore], "Upstash/Vercel KV REST sayacı hazır; UPSTASH_REDIS_REST_* veya KV_REST_API_* olmadan instance başına bellek sayacı."],
    ["Bütçe kontrolü", "implemented", ["src/lib/isolation/guard.ts", "src/server/az/core-service.ts"], [T.dataCore, T.services]],
    ["Güvenli varsayılanlar", "implemented", ["src/lib/isolation/guard.ts", "src/server/http/tenant-route.ts"], [T.dataCore, T.routes]],
  ]),
  node("J", [
    ["Kaynak gösterme", "implemented", ["src/lib/quality/output-quality.ts"], [T.dataCore]],
    ["Yapılandırılmış çıktı", "implemented", ["src/lib/quality/output-quality.ts"], [T.dataCore]],
    ["Guardrail", "implemented", ["src/lib/quality/output-quality.ts", "src/lib/risk/risk-scanner.ts"], [T.dataCore]],
    ["Düşük güven durumunda eskalasyon", "implemented", ["src/lib/quality/output-quality.ts", "src/server/az/core-service.ts"], [T.dataCore, T.services]],
  ]),
  node("K", [
    ["Hızlı başlangıç", "implemented", ["src/lib/ux/experience.ts", "app/api/quickstart/route.ts"], [T.product]],
    ["Arama", "implemented", ["app/api/search/route.ts", "src/lib/core/retrieval.ts"], [T.dataCore]],
    ["Sohbet", "implemented", ["app/api/core/ask/route.ts", "src/server/az/core-service.ts"], [T.services, T.routes]],
    ["Açıklanabilir sonuç", "implemented", ["src/lib/ux/experience.ts"], [T.product]],
    ["Kişisel alan + ekip alanı", "implemented", ["src/lib/ux/experience.ts", M.platform], [T.product, T.rls]],
  ]),
  node("L", [
    ["İş kuralları", "implemented", ["src/lib/core/tools.ts", "src/lib/flows/flows.ts"], [T.dataCore, T.product]],
    ["Fonksiyonlar", "implemented", ["src/lib/core/tools.ts", "app/api/tools/route.ts"], [T.dataCore]],
    ["Araç izinleri", "implemented", ["src/lib/core/tools.ts", "src/lib/isolation/guard.ts"], [T.dataCore]],
    ["Hata yönetimi", "implemented", ["src/lib/core/tools.ts", "src/server/http/tenant-route.ts"], [T.dataCore, T.routes]],
    ["Her eylem için audit izi", "implemented", ["src/lib/core/tools.ts", "src/server/az/records.ts"], [T.dataCore, T.services]],
  ]),
  node("M", [
    ["Araştır", "implemented", ["src/lib/flows/flows.ts", "src/server/az/flow-service.ts"], [T.product, T.services]],
    ["Özetle", "implemented", ["src/lib/flows/flows.ts", "src/lib/core/tools.ts"], [T.product, T.services]],
    ["Üret", "requires_credentials", ["src/server/az/flow-service.ts", "src/lib/ai/task-ai.ts", ...AI], [T.services, T.ai], "Üretim adımı gerçek sağlayıcı registry'sini kullanır; anahtar yoksa production'da ai_provider_not_configured, mock yalnızca test/development."],
    ["Onaylat", "implemented", ["src/lib/flows/flows.ts", "src/server/az/flow-service.ts"], [T.product, T.services]],
    ["Yayınla", "implemented", ["src/lib/core/tools.ts"], [T.dataCore, T.services], "Yalnızca yapılandırılmış kanala; aksi halde channel_not_configured."],
    ["Takip et", "implemented", ["src/server/az/flow-service.ts"], [T.services]],
    ["Tekrar kullanılabilir şablonlar", "implemented", ["src/lib/flows/flows.ts", "app/api/flows/templates/route.ts"], [T.product]],
  ]),
  node("N", [
    ["Görev", "implemented", ["src/lib/notifications/notifications.ts", "src/server/az/records.ts"], [T.product, T.services]],
    ["Uyarı", "implemented", ["src/lib/notifications/notifications.ts"], [T.product]],
    ["Özet", "implemented", ["src/lib/notifications/notifications.ts"], [T.product]],
    ["İnsan onayı", "implemented", ["src/server/az/records.ts", "app/api/approvals/[id]/route.ts"], [T.services]],
    ["SLA takibi", "implemented", ["src/lib/notifications/notifications.ts", M.pipelines], [T.product, T.services]],
    ["Doğru kişiye, doğru zamanda", "implemented", ["src/lib/notifications/notifications.ts", "src/lib/notifications/routing.ts", "src/server/az/notification-dispatch.ts", "app/api/notifications/routes/route.ts", M.pipelines, M.delivery], [T.product, T.notify, T.delivery], "RACI ekibi + tenant rotası + öncelik + sessiz saat (saat dilimi); harici teslim ilgili kanal anahtarını gerektirir."],
  ]),
  node("O", [
    ["Web + API + ekip araçları", "requires_credentials", ["src/lib/channels/channels.ts", "app/api/channels/route.ts", "app/api/channels/slack/events/route.ts", "app/api/channels/teams/messages/route.ts"], [T.strategy, T.routes, T.notify], "Web ve API çalışır; Slack/Teams uç noktaları imza doğrulamalı hazır, anahtar bekliyor."],
    ["Tek kimlik", "implemented", ["src/lib/channels/channels.ts", "app/api/channels/identities/route.ts"], [T.strategy, T.services]],
    ["Tek bağlam", "implemented", ["src/lib/channels/channels.ts", "src/server/az/core-service.ts"], [T.strategy, T.services]],
    ["Kesintisiz kullanıcı yolculuğu", "implemented", ["app/api/channels/inbound/route.ts"], [T.services]],
  ]),
  node("P", [
    ["Küçük kullanıcı grubu", "implemented", ["src/lib/rollout/rollout.ts"], [T.product]],
    ["Güvenlik/kalite kapıları", "implemented", ["src/lib/rollout/rollout.ts", "src/server/az/ops-service.ts"], [T.product, T.services]],
    ["Kademeli yaygınlaştır", "implemented", ["src/lib/rollout/rollout.ts", "app/api/rollouts/[id]/route.ts"], [T.product]],
    ["Her akış için sahip", "implemented", ["src/lib/rollout/rollout.ts", M.platform], [T.product]],
    ["Geri dönüş planı", "implemented", ["src/lib/rollout/rollout.ts"], [T.product]],
    ["Operasyon runbook’u", "implemented", ["RUNBOOK.md", "src/lib/rollout/rollout.ts"], [T.product]],
  ]),
  node("Q", [
    ["Altın veri seti", "implemented", ["src/lib/eval/eval.ts", "app/api/eval/cases/route.ts"], [T.ops]],
    ["Regresyon", "implemented", ["src/lib/eval/eval.ts", "src/server/az/ops-service.ts"], [T.ops, T.services]],
    ["İnsan değerlendirmesi", "implemented", ["src/lib/eval/eval.ts", "src/lib/feedback/feedback.ts"], [T.ops]],
    ["A/B", "implemented", ["src/lib/eval/eval.ts"], [T.ops]],
    ["Doğruluk · fayda · gecikme", "implemented", ["src/lib/eval/eval.ts"], [T.ops]],
  ]),
  node("R", [
    ["Prompt injection", "implemented", ["src/lib/risk/risk-scanner.ts"], [T.ops]],
    ["Veri sızıntısı", "implemented", ["src/lib/risk/risk-scanner.ts"], [T.ops]],
    ["Model kötüye kullanımı testleri", "implemented", ["src/lib/risk/risk-scanner.ts", "app/api/risk/scan/route.ts"], [T.ops]],
    ["Politika + olay müdahalesi", "implemented", ["src/lib/risk/risk-scanner.ts", "app/api/risk/incidents/route.ts", "src/server/az/records.ts"], [T.ops, T.services]],
  ]),
  node("S", [
    ["Gözlemlenebilirlik", "implemented", ["src/lib/sre/sre.ts", "app/api/ops/slo/route.ts"], [T.ops, T.services]],
    ["SLA", "implemented", ["src/lib/sre/sre.ts"], [T.ops]],
    ["Token/altyapı bütçesi", "implemented", ["src/lib/sre/sre.ts", "src/server/az/core-service.ts"], [T.ops, T.services]],
    ["Fallback", "implemented", ["src/lib/core/model-routing.ts"], [T.dataCore]],
    ["Alarmlar", "implemented", ["src/lib/sre/sre.ts"], [T.ops]],
    ["Kapasite planı", "implemented", ["src/lib/sre/sre.ts"], [T.ops]],
  ]),
  node("T", [
    ["Ürün, mühendislik, veri, hukuk, destek sorumlulukları", "implemented", ["src/lib/ownership/ownership.ts", "app/api/ownership/route.ts"], [T.ops]],
    ["RACI", "implemented", ["src/lib/ownership/ownership.ts"], [T.ops]],
    ["Karar kayıtları", "implemented", ["src/lib/ownership/ownership.ts", "app/api/ownership/decisions/route.ts", M.platform], [T.ops, T.rls]],
  ]),
  node("U", [
    ["Veri sınıfları", "implemented", ["src/lib/compliance/compliance.ts"], [T.ops]],
    ["Saklama", "implemented", ["src/lib/compliance/compliance.ts", M.pipelines], [T.ops, T.services], "Günlük rapor kuru çalıştırmadır (dry run); otomatik silme yapılmaz."],
    ["Silme", "implemented", ["src/lib/compliance/compliance.ts", "app/api/compliance/deletion-requests/[id]/route.ts", "src/server/az/pipeline-service.ts"], [T.ops, T.services], "Onaylı talepler anonimleştirme (UPDATE) ile uygulanır; satır silinmez."],
    ["Erişim ve denetim", "implemented", ["src/lib/compliance/compliance.ts", "src/server/az/records.ts"], [T.ops]],
    ["Privacy by design", "implemented", ["src/lib/preparation/pii.ts", "src/lib/feedback/feedback.ts"], [T.dataCore, T.strategy]],
  ]),
  node("V-Z", [
    ["V: versiyonla", "implemented", ["src/lib/growth/growth.ts"], [T.ops]],
    ["W: workflow’ları çoğalt", "implemented", ["src/lib/growth/growth.ts", "app/api/flows/templates/route.ts"], [T.ops]],
    ["X: deneyleri ölç", "implemented", ["src/lib/eval/eval.ts"], [T.ops]],
    ["Y: kullanıcıyı elde tut", "implemented", ["src/lib/growth/growth.ts", "app/api/growth/route.ts"], [T.ops]],
    ["Z: sürekli öğren, yeni kullanım alanları aç", "implemented", ["src/lib/growth/growth.ts", "src/server/az/pipeline-service.ts"], [T.ops, T.services]],
  ]),
];

const edge = (id: string, status: CoverageStatus, code: string[], tests: string[], note?: string): CoverageItem => ({
  id,
  status,
  code,
  tests,
  ...(note ? { note } : {}),
});

export const EDGE_COVERAGE: CoverageItem[] = [
  edge("A->B", "implemented", ["src/lib/blueprint/blueprint.ts"], [T.strategy], "B aşaması A tamamlanmadan kabul edilmez."),
  edge("B->C", "implemented", ["src/lib/blueprint/blueprint.ts"], [T.strategy], "Her kullanım senaryosunun kanalı olmalı."),
  edge("C->D", "implemented", ["src/lib/blueprint/blueprint.ts"], [T.strategy], "Her kanal/senaryo için bilgi kaynağı zorunlu."),
  edge("D->E", "implemented", ["src/lib/blueprint/blueprint.ts", "src/lib/kpi/kpi.ts"], [T.strategy]),
  edge("E->F", "implemented", ["src/lib/blueprint/blueprint.ts", "src/lib/feedback/feedback.ts"], [T.strategy]),
  edge("G->H", "implemented", [M.pipelines, "src/server/az/pipeline-service.ts"], [T.services], "mouseai/document.received → prepareStoredDocument"),
  edge("H->CORE", "implemented", ["src/server/az/core-service.ts", "src/lib/core/retrieval.ts"], [T.services]),
  edge("CORE->I", "implemented", ["src/lib/core/orchestrator.ts", "src/lib/isolation/guard.ts"], [T.dataCore]),
  edge("I->J", "implemented", ["src/lib/core/orchestrator.ts", "src/lib/quality/output-quality.ts"], [T.dataCore]),
  edge("CORE->K", "implemented", ["src/lib/ux/experience.ts", "app/api/core/ask/route.ts"], [T.product, T.routes]),
  edge("CORE->L", "implemented", ["src/lib/core/tools.ts", "src/server/az/flow-service.ts"], [T.dataCore, T.services]),
  edge("CORE->M", "implemented", ["src/server/az/flow-service.ts", M.pipelines], [T.services]),
  edge("CORE->N", "implemented", ["src/server/az/core-service.ts", "src/server/az/records.ts"], [T.services]),
  edge("CORE->O", "implemented", ["app/api/channels/inbound/route.ts", "src/lib/channels/channels.ts"], [T.services]),
  edge("CORE->P", "implemented", ["src/lib/rollout/rollout.ts", "app/api/rollouts/check/route.ts"], [T.product]),
  edge("K->Q", "implemented", ["src/server/az/ops-service.ts", "src/lib/growth/growth.ts"], [T.ops, T.services], "Kullanıcı puanları eval kullanışlılığına, olumsuz geri bildirim altın vakaya dönüşür."),
  edge("L->R", "implemented", ["src/lib/core/tools.ts", "src/lib/risk/risk-scanner.ts"], [T.dataCore]),
  edge("M->S", "implemented", ["src/server/az/flow-service.ts", "src/server/az/ops-service.ts"], [T.services]),
  edge("N->T", "implemented", ["src/lib/notifications/notifications.ts", "src/lib/ownership/ownership.ts"], [T.product]),
  edge("O->U", "implemented", ["src/lib/compliance/compliance.ts", M.platform], [T.ops]),
  edge("P->V-Z", "implemented", ["src/lib/rollout/rollout.ts", "src/lib/growth/growth.ts", "app/api/growth/route.ts"], [T.product, T.ops]),
];

export const COVERAGE = { nodes: NODE_COVERAGE, edges: EDGE_COVERAGE };

export function coverageSummary() {
  const caps = NODE_COVERAGE.flatMap((n) => n.capabilities);
  const count = (items: CoverageItem[], s: CoverageStatus) => items.filter((i) => i.status === s).length;
  return {
    nodes: DIAGRAM_NODES.length,
    nodesMapped: NODE_COVERAGE.length,
    edges: DIAGRAM_EDGES.length,
    edgesMapped: EDGE_COVERAGE.length,
    capabilities: caps.length,
    implemented: count(caps, "implemented") + count(EDGE_COVERAGE, "implemented"),
    partial: count(caps, "partial") + count(EDGE_COVERAGE, "partial"),
    requiresCredentials: count(caps, "requires_credentials") + count(EDGE_COVERAGE, "requires_credentials"),
    unmapped: DIAGRAM_NODES.filter((n) => !NODE_COVERAGE.some((c) => c.node === n.id)).map((n) => n.id),
  };
}

/** Markdown matrix used for docs/diagrams/A-Z-COVERAGE.md (kept in sync by a test). */
export function renderCoverageMarkdown(): string {
  const s = coverageSummary();
  const cell = (xs: string[]) => xs.map((x) => `\`${x}\``).join("<br>");
  const lines = [
    "# A–Z Diyagram Kapsam Matrisi",
    "",
    "> Bu dosya `npm run diagram:matrix` ile `src/lib/diagram/coverage.ts` üzerinden üretilir; elle düzenlemeyin.",
    "",
    `Kaynak: \`public/diagrams/masuai-a-z-diyagram.svg\` · Kart: ${s.nodes} (eşlenen ${s.nodesMapped}) · Bağlantı: ${s.edges} (eşlenen ${s.edgesMapped}) · Yetenek: ${s.capabilities}`,
    "",
    `Durum: implemented ${s.implemented} · partial ${s.partial} · requires_credentials ${s.requiresCredentials} · eşleşmeyen kart: ${s.unmapped.length ? s.unmapped.join(", ") : "yok"}`,
    "",
    "## Kartlar",
    "",
  ];
  for (const n of NODE_COVERAGE) {
    const title = DIAGRAM_NODES.find((d) => d.id === n.node)?.title ?? n.node;
    lines.push(`### ${title}`, "", "| # | Yetenek | Durum | Kod | Test | Not |", "|---|---|---|---|---|---|");
    for (const c of n.capabilities) lines.push(`| ${c.id} | ${c.capability} | ${c.status} | ${cell(c.code)} | ${cell(c.tests)} | ${c.note ?? ""} |`);
    lines.push("");
  }
  lines.push("## Bağlantılar", "", "| Kenar | Tür | Etiket | Durum | Kod | Test | Not |", "|---|---|---|---|---|---|---|");
  for (const e of EDGE_COVERAGE) {
    const d = DIAGRAM_EDGES.find((x) => x.id === e.id);
    lines.push(`| ${e.id} | ${d?.kind ?? "?"} | ${d?.label ?? ""} | ${e.status} | ${cell(e.code)} | ${cell(e.tests)} | ${e.note ?? ""} |`);
  }
  lines.push("");
  return lines.join("\n");
}
