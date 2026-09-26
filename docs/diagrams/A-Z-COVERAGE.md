# A–Z Diyagram Kapsam Matrisi

> Bu dosya `npm run diagram:matrix` ile `src/lib/diagram/coverage.ts` üzerinden üretilir; elle düzenlemeyin.

Kaynak: `public/diagrams/masuai-a-z-diyagram.svg` · Kart: 23 (eşlenen 23) · Bağlantı: 21 (eşlenen 21) · Yetenek: 117

Durum: implemented 130 · partial 1 · requires_credentials 7 · eşleşmeyen kart: yok

## Kartlar

### A — Amaç & Konumlandırma

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| A#1 | Hedef kullanıcı | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| A#2 | Ana problem | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |
| A#3 | Değer önerisi | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |
| A#4 | Başarı tanımı | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |

### B — Brief & Gereksinim

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| B#1 | Kullanım senaryoları | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |
| B#2 | Roller | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql`<br>`src/lib/isolation/guard.ts` | `tests/az/strategy.test.ts` |  |
| B#3 | Öncelikler | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |
| B#4 | Kabul kriterleri | implemented | `src/lib/blueprint/blueprint.ts`<br>`app/api/blueprints/[id]/stages/[stage]/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |

### C — Channels

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| C#1 | Web | implemented | `src/lib/channels/channels.ts`<br>`app/api/channels/inbound/route.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| C#2 | Mobil | partial | `src/lib/channels/channels.ts`<br>`app/diagram/diagram-explorer.tsx`<br>`app/globals.css` | `tests/az/strategy.test.ts`<br>`tests/ui/diagram-ui.test.tsx` | Web arayüzü telefon ve tablette çalışır (duyarlı, dokunmatik hedefler); yerel mobil istemci yok, kanal 'planned'. |
| C#3 | API | implemented | `src/lib/channels/channels.ts`<br>`app/api/channels/inbound/route.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| C#4 | E-posta | requires_credentials | `src/lib/notifications/senders.ts`<br>`src/server/az/notification-dispatch.ts`<br>`supabase/migrations/0005_delivery_and_crm.sql`<br>`src/lib/channels/channels.ts` | `tests/integrations/notifications.test.ts`<br>`tests/db/az-delivery-crm.test.ts` | Resend adapter'ı, retry ve teslim kaydı hazır; EMAIL_PROVIDER_KEY + EMAIL_FROM olmadan teslimat channel_not_configured. |
| C#5 | Slack/Teams | requires_credentials | `src/lib/notifications/senders.ts`<br>`src/server/az/notification-dispatch.ts`<br>`supabase/migrations/0005_delivery_and_crm.sql`<br>`src/lib/channels/signatures.ts`<br>`app/api/channels/slack/events/route.ts`<br>`app/api/channels/teams/messages/route.ts` | `tests/integrations/notifications.test.ts`<br>`tests/db/az-delivery-crm.test.ts`<br>`tests/api/az-routes.test.ts` | Webhook gönderimi ve imza doğrulaması hazır; SLACK_WEBHOOK_URL, SLACK_SIGNING_SECRET, TEAMS_WEBHOOK_URL, TEAMS_OUTGOING_WEBHOOK_SECRET gerekir. |
| C#6 | CRM yüzeyleri | requires_credentials | `src/lib/crm/crm-adapter.ts`<br>`src/server/az/crm-service.ts`<br>`app/api/crm/contacts/route.ts`<br>`supabase/migrations/0005_delivery_and_crm.sql` | `tests/integrations/crm.test.ts`<br>`tests/db/az-delivery-crm.test.ts`<br>`tests/api/az-routes.test.ts` | HubSpot adapter'ı (tenant izolasyonu, timeout/retry, audit) hazır; CRM_API_KEY olmadan 503 crm_not_configured. |

### D — Domain Bilgisi

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| D#1 | Sözlük | implemented | `src/lib/knowledge/knowledge.ts`<br>`app/api/knowledge/glossary/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts`<br>`tests/db/az-rls.test.ts` |  |
| D#2 | Süreçler | implemented | `src/lib/knowledge/knowledge.ts`<br>`app/api/knowledge/route.ts` | `tests/az/strategy.test.ts` |  |
| D#3 | Politika | implemented | `src/lib/knowledge/knowledge.ts`<br>`src/lib/core/prompt-policy.ts` | `tests/az/strategy.test.ts`<br>`tests/az/data-core.test.ts` |  |
| D#4 | Kaynak sahipleri | implemented | `src/lib/knowledge/knowledge.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/strategy.test.ts` |  |
| D#5 | Güncellik | implemented | `src/lib/knowledge/knowledge.ts` | `tests/az/strategy.test.ts` |  |

### E — Etki & KPI

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| E#1 | Zaman tasarrufu | implemented | `src/lib/kpi/kpi.ts`<br>`app/api/kpi/route.ts`<br>`src/server/az/ops-service.ts` | `tests/az/strategy.test.ts` |  |
| E#2 | Doğruluk | implemented | `src/lib/kpi/kpi.ts` | `tests/az/strategy.test.ts` |  |
| E#3 | Dönüşüm | implemented | `src/lib/kpi/kpi.ts` | `tests/az/strategy.test.ts` |  |
| E#4 | Memnuniyet | implemented | `src/lib/kpi/kpi.ts` | `tests/az/strategy.test.ts` |  |
| E#5 | Maliyet | implemented | `src/lib/kpi/kpi.ts`<br>`supabase/migrations/0003_schema_reconciliation.sql` | `tests/az/strategy.test.ts` |  |

### F — Feedback Döngüsü

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| F#1 | Kullanıcı geri bildirimi | implemented | `src/lib/feedback/feedback.ts`<br>`app/api/feedback/route.ts`<br>`src/server/az/pipeline-service.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| F#2 | Etiketleme | implemented | `src/lib/feedback/feedback.ts`<br>`src/inngest/functions/a-z-pipelines.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| F#3 | İyileştirme kuyruğu | implemented | `src/lib/feedback/feedback.ts`<br>`src/server/az/pipeline-service.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| F#4 | İnsan onayı gereken noktalar | implemented | `src/lib/feedback/feedback.ts`<br>`app/api/approvals/[id]/route.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |

### G — Veri Alımı

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| G#1 | Dosya | implemented | `src/lib/ingestion/ingestion.ts`<br>`app/api/ingest/route.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| G#2 | API | implemented | `app/api/ingest/route.ts` | `tests/db/az-services.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| G#3 | Webhook | implemented | `src/lib/ingestion/ingestion.ts`<br>`app/api/ingest/webhook/[sourceId]/route.ts` | `tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` | HMAC imzası INGEST_WEBHOOK_SECRET ile; secret yoksa 503 secret_not_configured. |
| G#4 | Doküman | implemented | `src/server/az/pipeline-service.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/db/az-services.test.ts` |  |
| G#5 | Olay akışı | implemented | `src/lib/ingestion/ingestion.ts`<br>`src/inngest/functions/a-z-pipelines.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| G#6 | Şema + versiyon + sahiplik | implemented | `src/lib/ingestion/ingestion.ts`<br>`app/api/ingest/sources/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/data-core.test.ts`<br>`tests/db/az-rls.test.ts` |  |

### H — Hazırlama

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| H#1 | Temizleme | implemented | `src/lib/preparation/prepare.ts` | `tests/az/data-core.test.ts` |  |
| H#2 | Parçalama | implemented | `src/lib/preparation/prepare.ts`<br>`src/server/az/pipeline-service.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| H#3 | PII maskeleme | implemented | `src/lib/preparation/pii.ts` | `tests/az/data-core.test.ts` |  |
| H#4 | Metadata | implemented | `src/lib/preparation/prepare.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/data-core.test.ts` |  |
| H#5 | Kalite kapıları | implemented | `src/lib/preparation/prepare.ts` | `tests/az/data-core.test.ts` |  |
| H#6 | İzlenebilirlik | implemented | `src/lib/preparation/prepare.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |

### MASUAI CORE

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| CORE#1 | Model yönlendirme | requires_credentials | `src/lib/ai/provider-registry.ts`<br>`src/lib/ai/providers/openai.ts`<br>`src/lib/ai/providers/anthropic.ts`<br>`src/lib/core/model-routing.ts` | `tests/integrations/ai-providers.test.ts`<br>`tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` | OpenAI ve Anthropic adapter'ları (resmi SDK, timeout/retry) hazır; production'da anahtar yoksa 503 ai_provider_not_configured, mock yalnızca test/development. |
| CORE#2 | RAG | implemented | `src/lib/core/retrieval.ts`<br>`src/server/az/core-service.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| CORE#3 | Araç çağrısı | implemented | `src/lib/core/tools.ts`<br>`app/api/tools/[name]/route.ts` | `tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| CORE#4 | Prompt politikası | implemented | `src/lib/core/prompt-policy.ts` | `tests/az/data-core.test.ts` |  |
| CORE#5 | Hafıza | implemented | `src/lib/core/prompt-policy.ts`<br>`src/lib/channels/channels.ts` | `tests/az/data-core.test.ts` |  |
| CORE#6 | Orkestrasyon | implemented | `src/lib/core/orchestrator.ts`<br>`app/api/core/ask/route.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| CORE#7 | Girdi → bağlam → karar → eylem → kanıt | implemented | `src/lib/core/orchestrator.ts` | `tests/az/data-core.test.ts` |  |

### I — İzolasyon

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| I#1 | Tenant sınırları | implemented | `src/lib/isolation/guard.ts`<br>`supabase/migrations/0003_schema_reconciliation.sql`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/data-core.test.ts`<br>`tests/db/az-rls.test.ts` |  |
| I#2 | RBAC | implemented | `src/lib/isolation/guard.ts`<br>`src/server/http/tenant-route.ts` | `tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| I#3 | Oran limitleri | requires_credentials | `src/lib/isolation/guard.ts`<br>`src/lib/ratelimit/distributed.ts` | `tests/integrations/rate-limit.test.ts`<br>`tests/az/data-core.test.ts` | Upstash/Vercel KV REST sayacı hazır; UPSTASH_REDIS_REST_* veya KV_REST_API_* olmadan instance başına bellek sayacı. |
| I#4 | Bütçe kontrolü | implemented | `src/lib/isolation/guard.ts`<br>`src/server/az/core-service.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| I#5 | Güvenli varsayılanlar | implemented | `src/lib/isolation/guard.ts`<br>`src/server/http/tenant-route.ts` | `tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` |  |

### J — Jeneratif Çıktı Kalitesi

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| J#1 | Kaynak gösterme | implemented | `src/lib/quality/output-quality.ts` | `tests/az/data-core.test.ts` |  |
| J#2 | Yapılandırılmış çıktı | implemented | `src/lib/quality/output-quality.ts` | `tests/az/data-core.test.ts` |  |
| J#3 | Guardrail | implemented | `src/lib/quality/output-quality.ts`<br>`src/lib/risk/risk-scanner.ts` | `tests/az/data-core.test.ts` |  |
| J#4 | Düşük güven durumunda eskalasyon | implemented | `src/lib/quality/output-quality.ts`<br>`src/server/az/core-service.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |

### K — Kullanıcı Deneyimi

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| K#1 | Hızlı başlangıç | implemented | `src/lib/ux/experience.ts`<br>`app/api/quickstart/route.ts` | `tests/az/product.test.ts` |  |
| K#2 | Arama | implemented | `app/api/search/route.ts`<br>`src/lib/core/retrieval.ts` | `tests/az/data-core.test.ts` |  |
| K#3 | Sohbet | implemented | `app/api/core/ask/route.ts`<br>`src/server/az/core-service.ts` | `tests/db/az-services.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| K#4 | Açıklanabilir sonuç | implemented | `src/lib/ux/experience.ts` | `tests/az/product.test.ts` |  |
| K#5 | Kişisel alan + ekip alanı | implemented | `src/lib/ux/experience.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/product.test.ts`<br>`tests/db/az-rls.test.ts` |  |

### L — Logic & Tools

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| L#1 | İş kuralları | implemented | `src/lib/core/tools.ts`<br>`src/lib/flows/flows.ts` | `tests/az/data-core.test.ts`<br>`tests/az/product.test.ts` |  |
| L#2 | Fonksiyonlar | implemented | `src/lib/core/tools.ts`<br>`app/api/tools/route.ts` | `tests/az/data-core.test.ts` |  |
| L#3 | Araç izinleri | implemented | `src/lib/core/tools.ts`<br>`src/lib/isolation/guard.ts` | `tests/az/data-core.test.ts` |  |
| L#4 | Hata yönetimi | implemented | `src/lib/core/tools.ts`<br>`src/server/http/tenant-route.ts` | `tests/az/data-core.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| L#5 | Her eylem için audit izi | implemented | `src/lib/core/tools.ts`<br>`src/server/az/records.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |

### M — Modüler Akışlar

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| M#1 | Araştır | implemented | `src/lib/flows/flows.ts`<br>`src/server/az/flow-service.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| M#2 | Özetle | implemented | `src/lib/flows/flows.ts`<br>`src/lib/core/tools.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| M#3 | Üret | requires_credentials | `src/server/az/flow-service.ts`<br>`src/lib/ai/task-ai.ts`<br>`src/lib/ai/provider-registry.ts`<br>`src/lib/ai/providers/openai.ts`<br>`src/lib/ai/providers/anthropic.ts`<br>`src/lib/core/model-routing.ts` | `tests/db/az-services.test.ts`<br>`tests/integrations/ai-providers.test.ts` | Üretim adımı gerçek sağlayıcı registry'sini kullanır; anahtar yoksa production'da ai_provider_not_configured, mock yalnızca test/development. |
| M#4 | Onaylat | implemented | `src/lib/flows/flows.ts`<br>`src/server/az/flow-service.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| M#5 | Yayınla | implemented | `src/lib/core/tools.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` | Yalnızca yapılandırılmış kanala; aksi halde channel_not_configured. |
| M#6 | Takip et | implemented | `src/server/az/flow-service.ts` | `tests/db/az-services.test.ts` |  |
| M#7 | Tekrar kullanılabilir şablonlar | implemented | `src/lib/flows/flows.ts`<br>`app/api/flows/templates/route.ts` | `tests/az/product.test.ts` |  |

### N — Notifications

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| N#1 | Görev | implemented | `src/lib/notifications/notifications.ts`<br>`src/server/az/records.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| N#2 | Uyarı | implemented | `src/lib/notifications/notifications.ts` | `tests/az/product.test.ts` |  |
| N#3 | Özet | implemented | `src/lib/notifications/notifications.ts` | `tests/az/product.test.ts` |  |
| N#4 | İnsan onayı | implemented | `src/server/az/records.ts`<br>`app/api/approvals/[id]/route.ts` | `tests/db/az-services.test.ts` |  |
| N#5 | SLA takibi | implemented | `src/lib/notifications/notifications.ts`<br>`src/inngest/functions/a-z-pipelines.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| N#6 | Doğru kişiye, doğru zamanda | implemented | `src/lib/notifications/notifications.ts`<br>`src/lib/notifications/routing.ts`<br>`src/server/az/notification-dispatch.ts`<br>`app/api/notifications/routes/route.ts`<br>`src/inngest/functions/a-z-pipelines.ts`<br>`supabase/migrations/0005_delivery_and_crm.sql` | `tests/az/product.test.ts`<br>`tests/integrations/notifications.test.ts`<br>`tests/db/az-delivery-crm.test.ts` | RACI ekibi + tenant rotası + öncelik + sessiz saat (saat dilimi); harici teslim ilgili kanal anahtarını gerektirir. |

### O — Omnichannel

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| O#1 | Web + API + ekip araçları | requires_credentials | `src/lib/channels/channels.ts`<br>`app/api/channels/route.ts`<br>`app/api/channels/slack/events/route.ts`<br>`app/api/channels/teams/messages/route.ts` | `tests/az/strategy.test.ts`<br>`tests/api/az-routes.test.ts`<br>`tests/integrations/notifications.test.ts` | Web ve API çalışır; Slack/Teams uç noktaları imza doğrulamalı hazır, anahtar bekliyor. |
| O#2 | Tek kimlik | implemented | `src/lib/channels/channels.ts`<br>`app/api/channels/identities/route.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| O#3 | Tek bağlam | implemented | `src/lib/channels/channels.ts`<br>`src/server/az/core-service.ts` | `tests/az/strategy.test.ts`<br>`tests/db/az-services.test.ts` |  |
| O#4 | Kesintisiz kullanıcı yolculuğu | implemented | `app/api/channels/inbound/route.ts` | `tests/db/az-services.test.ts` |  |

### P — Pilot → Production

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| P#1 | Küçük kullanıcı grubu | implemented | `src/lib/rollout/rollout.ts` | `tests/az/product.test.ts` |  |
| P#2 | Güvenlik/kalite kapıları | implemented | `src/lib/rollout/rollout.ts`<br>`src/server/az/ops-service.ts` | `tests/az/product.test.ts`<br>`tests/db/az-services.test.ts` |  |
| P#3 | Kademeli yaygınlaştır | implemented | `src/lib/rollout/rollout.ts`<br>`app/api/rollouts/[id]/route.ts` | `tests/az/product.test.ts` |  |
| P#4 | Her akış için sahip | implemented | `src/lib/rollout/rollout.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/product.test.ts` |  |
| P#5 | Geri dönüş planı | implemented | `src/lib/rollout/rollout.ts` | `tests/az/product.test.ts` |  |
| P#6 | Operasyon runbook’u | implemented | `RUNBOOK.md`<br>`src/lib/rollout/rollout.ts` | `tests/az/product.test.ts` |  |

### Q — Quality & Eval

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| Q#1 | Altın veri seti | implemented | `src/lib/eval/eval.ts`<br>`app/api/eval/cases/route.ts` | `tests/az/ops.test.ts` |  |
| Q#2 | Regresyon | implemented | `src/lib/eval/eval.ts`<br>`src/server/az/ops-service.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` |  |
| Q#3 | İnsan değerlendirmesi | implemented | `src/lib/eval/eval.ts`<br>`src/lib/feedback/feedback.ts` | `tests/az/ops.test.ts` |  |
| Q#4 | A/B | implemented | `src/lib/eval/eval.ts` | `tests/az/ops.test.ts` |  |
| Q#5 | Doğruluk · fayda · gecikme | implemented | `src/lib/eval/eval.ts` | `tests/az/ops.test.ts` |  |

### R — Risk & Güvenlik

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| R#1 | Prompt injection | implemented | `src/lib/risk/risk-scanner.ts` | `tests/az/ops.test.ts` |  |
| R#2 | Veri sızıntısı | implemented | `src/lib/risk/risk-scanner.ts` | `tests/az/ops.test.ts` |  |
| R#3 | Model kötüye kullanımı testleri | implemented | `src/lib/risk/risk-scanner.ts`<br>`app/api/risk/scan/route.ts` | `tests/az/ops.test.ts` |  |
| R#4 | Politika + olay müdahalesi | implemented | `src/lib/risk/risk-scanner.ts`<br>`app/api/risk/incidents/route.ts`<br>`src/server/az/records.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` |  |

### S — SRE & Maliyet

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| S#1 | Gözlemlenebilirlik | implemented | `src/lib/sre/sre.ts`<br>`app/api/ops/slo/route.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` |  |
| S#2 | SLA | implemented | `src/lib/sre/sre.ts` | `tests/az/ops.test.ts` |  |
| S#3 | Token/altyapı bütçesi | implemented | `src/lib/sre/sre.ts`<br>`src/server/az/core-service.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` |  |
| S#4 | Fallback | implemented | `src/lib/core/model-routing.ts` | `tests/az/data-core.test.ts` |  |
| S#5 | Alarmlar | implemented | `src/lib/sre/sre.ts` | `tests/az/ops.test.ts` |  |
| S#6 | Kapasite planı | implemented | `src/lib/sre/sre.ts` | `tests/az/ops.test.ts` |  |

### T — Takım & Sahiplik

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| T#1 | Ürün, mühendislik, veri, hukuk, destek sorumlulukları | implemented | `src/lib/ownership/ownership.ts`<br>`app/api/ownership/route.ts` | `tests/az/ops.test.ts` |  |
| T#2 | RACI | implemented | `src/lib/ownership/ownership.ts` | `tests/az/ops.test.ts` |  |
| T#3 | Karar kayıtları | implemented | `src/lib/ownership/ownership.ts`<br>`app/api/ownership/decisions/route.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/ops.test.ts`<br>`tests/db/az-rls.test.ts` |  |

### U — Uyum & Gizlilik

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| U#1 | Veri sınıfları | implemented | `src/lib/compliance/compliance.ts` | `tests/az/ops.test.ts` |  |
| U#2 | Saklama | implemented | `src/lib/compliance/compliance.ts`<br>`src/inngest/functions/a-z-pipelines.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` | Günlük rapor kuru çalıştırmadır (dry run); otomatik silme yapılmaz. |
| U#3 | Silme | implemented | `src/lib/compliance/compliance.ts`<br>`app/api/compliance/deletion-requests/[id]/route.ts`<br>`src/server/az/pipeline-service.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` | Onaylı talepler anonimleştirme (UPDATE) ile uygulanır; satır silinmez. |
| U#4 | Erişim ve denetim | implemented | `src/lib/compliance/compliance.ts`<br>`src/server/az/records.ts` | `tests/az/ops.test.ts` |  |
| U#5 | Privacy by design | implemented | `src/lib/preparation/pii.ts`<br>`src/lib/feedback/feedback.ts` | `tests/az/data-core.test.ts`<br>`tests/az/strategy.test.ts` |  |

### V–Z — Yaygınlaştırma ve Büyüme

| # | Yetenek | Durum | Kod | Test | Not |
|---|---|---|---|---|---|
| V-Z#1 | V: versiyonla | implemented | `src/lib/growth/growth.ts` | `tests/az/ops.test.ts` |  |
| V-Z#2 | W: workflow’ları çoğalt | implemented | `src/lib/growth/growth.ts`<br>`app/api/flows/templates/route.ts` | `tests/az/ops.test.ts` |  |
| V-Z#3 | X: deneyleri ölç | implemented | `src/lib/eval/eval.ts` | `tests/az/ops.test.ts` |  |
| V-Z#4 | Y: kullanıcıyı elde tut | implemented | `src/lib/growth/growth.ts`<br>`app/api/growth/route.ts` | `tests/az/ops.test.ts` |  |
| V-Z#5 | Z: sürekli öğren, yeni kullanım alanları aç | implemented | `src/lib/growth/growth.ts`<br>`src/server/az/pipeline-service.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` |  |

## Bağlantılar

| Kenar | Tür | Etiket | Durum | Kod | Test | Not |
|---|---|---|---|---|---|---|
| A->B | sync | Amaç, gereksinimleri belirler | implemented | `src/lib/blueprint/blueprint.ts` | `tests/az/strategy.test.ts` | B aşaması A tamamlanmadan kabul edilmez. |
| B->C | sync | Senaryolar ve roller kanalları seçer | implemented | `src/lib/blueprint/blueprint.ts` | `tests/az/strategy.test.ts` | Her kullanım senaryosunun kanalı olmalı. |
| C->D | sync | Kanal başına bilgi kaynakları bağlanır | implemented | `src/lib/blueprint/blueprint.ts` | `tests/az/strategy.test.ts` | Her kanal/senaryo için bilgi kaynağı zorunlu. |
| D->E | sync | Bilgi tabanı KPI tanımını besler | implemented | `src/lib/blueprint/blueprint.ts`<br>`src/lib/kpi/kpi.ts` | `tests/az/strategy.test.ts` |  |
| E->F | sync | KPI'lar geri bildirim ve onay noktalarını belirler | implemented | `src/lib/blueprint/blueprint.ts`<br>`src/lib/feedback/feedback.ts` | `tests/az/strategy.test.ts` |  |
| G->H | sync | Alınan veri hazırlamaya girer | implemented | `src/inngest/functions/a-z-pipelines.ts`<br>`src/server/az/pipeline-service.ts` | `tests/db/az-services.test.ts` | mouseai/document.received → prepareStoredDocument |
| H->CORE | sync | Hazırlanmış parçalar CORE bağlamına girer | implemented | `src/server/az/core-service.ts`<br>`src/lib/core/retrieval.ts` | `tests/db/az-services.test.ts` |  |
| CORE->I | sync | CORE kararı izolasyon kapısından geçer | implemented | `src/lib/core/orchestrator.ts`<br>`src/lib/isolation/guard.ts` | `tests/az/data-core.test.ts` |  |
| I->J | sync | İzin verilen çıktı kalite kapısına gider | implemented | `src/lib/core/orchestrator.ts`<br>`src/lib/quality/output-quality.ts` | `tests/az/data-core.test.ts` |  |
| CORE->K | sync | CORE sonucu kullanıcıya açıklanabilir sunulur | implemented | `src/lib/ux/experience.ts`<br>`app/api/core/ask/route.ts` | `tests/az/product.test.ts`<br>`tests/api/az-routes.test.ts` |  |
| CORE->L | sync | CORE araç çağrısı kurallar ve izinlerle yapılır | implemented | `src/lib/core/tools.ts`<br>`src/server/az/flow-service.ts` | `tests/az/data-core.test.ts`<br>`tests/db/az-services.test.ts` |  |
| CORE->M | sync | CORE modüler akış şablonlarını çalıştırır | implemented | `src/server/az/flow-service.ts`<br>`src/inngest/functions/a-z-pipelines.ts` | `tests/db/az-services.test.ts` |  |
| CORE->N | sync | CORE olayları bildirim/onay üretir | implemented | `src/server/az/core-service.ts`<br>`src/server/az/records.ts` | `tests/db/az-services.test.ts` |  |
| CORE->O | sync | CORE tek kimlik ve bağlamla tüm kanallara hizmet eder | implemented | `app/api/channels/inbound/route.ts`<br>`src/lib/channels/channels.ts` | `tests/db/az-services.test.ts` |  |
| CORE->P | sync | CORE özellikleri kademeli yayına bağlıdır | implemented | `src/lib/rollout/rollout.ts`<br>`app/api/rollouts/check/route.ts` | `tests/az/product.test.ts` |  |
| K->Q | async | Kullanıcı sonuçları değerlendirmeye akar | implemented | `src/server/az/ops-service.ts`<br>`src/lib/growth/growth.ts` | `tests/az/ops.test.ts`<br>`tests/db/az-services.test.ts` | Kullanıcı puanları eval kullanışlılığına, olumsuz geri bildirim altın vakaya dönüşür. |
| L->R | async | Araç eylemleri risk taramasından geçer | implemented | `src/lib/core/tools.ts`<br>`src/lib/risk/risk-scanner.ts` | `tests/az/data-core.test.ts` |  |
| M->S | async | Akış çalıştırmaları SLO ve maliyete yazılır | implemented | `src/server/az/flow-service.ts`<br>`src/server/az/ops-service.ts` | `tests/db/az-services.test.ts` |  |
| N->T | async | Bildirimler RACI sahibine yönlendirilir | implemented | `src/lib/notifications/notifications.ts`<br>`src/lib/ownership/ownership.ts` | `tests/az/product.test.ts` |  |
| O->U | async | Kanal verisi sınıflandırma ve saklama kurallarına tabidir | implemented | `src/lib/compliance/compliance.ts`<br>`supabase/migrations/0004_a_z_platform.sql` | `tests/az/ops.test.ts` |  |
| P->V-Z | async | Yayına alınan sürümler versiyonlanır ve büyüme ölçülür | implemented | `src/lib/rollout/rollout.ts`<br>`src/lib/growth/growth.ts`<br>`app/api/growth/route.ts` | `tests/az/product.test.ts`<br>`tests/az/ops.test.ts` |  |
