# MouseAI — Kanonik Ürün Yol Haritası ve Teknik Yürütme Planı

**Belge sürümü:** v1.0
**Son uzlaştırma:** 2026-10-01
**Kanonik üst kaynaklar:** ST Ana Kanun v3.6 → MAUSEAI Master Kanun ve Şartname v1.0

Bu belge üst kanun değildir. `P0–P9` ürün/teknik paketleri ve `G0–G12`
kabul kapıları kanonik yürütme eksenidir; eski `F0–F12` başlıkları yalnız
önceki teknik uygulama dilimlerini kaydeder. Bir teknik dilimin veya belgenin
tamamlanması ilgili G kapısını otomatik geçirmez. 14 günlük backlog ve demo
spesifikasyonu varsa yalnız P0/P1 kapsamındaki, üst kapılara tabi bir uygulama
dilimidir; takvim tarihi, üst yol haritası veya kabul kanıtı değildir.

Ana kanunun 17 aşaması, beş zorunlu modeli, A–L iş kırılımı ve G0–G12
kapıları P0–P9 uygulama paketlerinin tamamında korunur. P0–P9 stratejik A–H
akışının veya G kapılarının yerine geçmez.

**Repo:** `hakimceliker/mauseai`  
**Kanonik branch kuralı:** `main` doğrudan değiştirilmez; her faz `branch → PR → CI → review → merge → main doğrulaması` zinciriyle yürür.  
**Kod sahibi:** GPT/Codex  
**Review sahibi:** Claude veya bağımsız reviewer  
**Hesap/secret/ödeme sahibi:** Kullanıcı  
**Kabul dili:** `PLANNED`, `IN_PROGRESS`, `CODE_COMPLETE_LIVE_TEST_PENDING`, `COMPLETE`, `BLOCKED`. Kanıt gerektiren G kapıları ana kayıtta ayrıca `BEKLEMEDE`, `DÜZELTME`, `GEÇTİ` veya gerekçeli `UYGULANAMAZ` kullanır.

## Kanonik ürün paketleri — 2026-10-01

| Paket | Kapsam | Durum ve sınır |
|---|---|---|
| P0 | Canlı başlangıç, repo/runtime envanteri, Auth/RLS, Inngest, provider, audit/cost/idempotency | `PARTIAL`; kod/CI temeli var, gerçek A/B Auth/RLS, workflow, provider ve uzlaştırma kanıtları bekliyor. Local gateway da gerçek staging kanıtı olmadan kabul edilmiş sayılmaz. |
| P1 | Hedef/plan, tool kataloğu, onay/devralma ve API bakım kapsamı | Taslaklar mevcut; G0/G1 kararları ve kabul kanıtları bekliyor. |
| P2 | API bakım pilotu | `BLOCKED` — pilot çalıştırılmadı. |
| P3 | Windows runner pilotu | `BLOCKED` — cihaz pilotu çalıştırılmadı. |
| P4 | Bağımsız verifier, UNKNOWN, bounded retry, recovery/rollback | `NOT_ACCEPTED`; P2/P3 pilotlarından önce kritik güvenlik ve doğru sonuç ön koşulu olarak doğrulanmalı, pilot sonrasına ertelenemez. |
| P5 | Ortak çalışma, hafıza, provenance ve devralma | Tasarım/uygulama kabulü bekliyor. |
| P6 | Eval, kalite metriği, yöntem sürümleri ve canary | Veri seti/baseline ve ölçüm kanıtı bekliyor. |
| P7 | BI, KPI, finans, fiyat ve unit economics | `BLOCKED` — gerçek girdiler/baseline yok; değerler `VERİ YOK`/`KARAR BEKLİYOR`. |
| P8 | Hukuk, site/satış, release, backup/restore, incident ve destek | `BLOCKED` — onay ve işletme kanıtı bekliyor. |
| P9 | Enterprise SSO/SCIM, özel tenant, residency ve marketplace | Gelecek kapsam; mevcut müşteri talebi/ön koşul kanıtı yok. |

## G0–G12 geçiş kapıları

| Kapı | Kanonik anlam | Güncel durum |
|---|---|---|
| G0 | Proje açılışı | `BLOCKED` — sponsor, maliyet merkezi, operasyon risk sahibi ve başlangıç kararı kullanıcı onayı bekliyor |
| G1 | İhtiyaç | `BLOCKED` — müşteri/iş ihtiyacı kanıtı yok |
| G2 | Fizibilite | `PARTIAL` — şablonlar var, gerçek beş-model girdileri ve yetkili onay yok |
| G3 | Kapsam | `BLOCKED` — pilot başarı/çıkış sözleşmesi yok |
| G4 | Organizasyon | `BLOCKED` — tekil sorumlu, bütçe ve kapasite onayı yok |
| G5 | Mimari | `PARTIAL` — tasarım/CI kanıtı var, canlı güvenlik/ortam kabulü eksik |
| G6 | Prototip | `PARTIAL` — kod/test temeli var, kabul edilmiş uçtan uca prototip kanıtı eksik |
| G7 | Uçtan uca geliştirme | `BLOCKED` — Auth/tenant ve durable workflow canlı kanıtı eksik |
| G8 | Kalite ve güvenlik | `BLOCKED` — live security, verifier/recovery ve rollback kanıtı eksik |
| G9 | Pilot | `BLOCKED` — iki pilot çalıştırılmadı; gerekli G0–G8 ve P4 kontrolleri açık |
| G10 | Teknik yayın | `BLOCKED` — G0–G9 ve teknik yayın/rollback kararı yok |
| G11 | Satış veya yetkili iç kullanım | `BLOCKED` — satış/tahsilat veya bilinçli iç kullanım kabulü yok |
| G12 | Sürdürülebilir işletme | `BLOCKED` — operasyon sahibi, KPI, destek ve süreklilik kabulü yok |

Bu durumlar kaynak/gap kayıtlarındaki kanıt sınırını özetler; ek veya belge
tek başına kapı geçirmez. G10 teknik yayın, G11 ticari açılış/yetkili iç
kullanım ve G12 sürdürülebilir işletme farklı kararlardır.

## Teknik uygulama dilimleri (eski F0–F12)

Bu dilimler repo içi teknik iş kalemlerini gruplar. Bunların `[x]` işaretleri
yalnız kod/doküman teslimini ifade eder; G0–G12 kabulü veya P0–P9 paketinin
tamamlandığı anlamına gelmez.

### Güncel teknik yürütme durumu — 2026-10-01

- Main taban commit’i: `04256ac21a1c95da957fab501fc87c7acdf4cdd2` (PR #96 merge).
- Kod/CI değişiklikleri için PR #88, #89, #90, #91, #93, #94 ve #96 kayıtlı; bu merge’ler P0–P9 veya G0–G12 kabulü değildir.
- API test/kalite kanıtları merged PR-lerde mevcut; live Auth/RLS, Inngest ve provider testleri yürütülmedi.
- P0 live acceptance için approved A/B test accounts, workflow ID ve private gateway/provider erişimi gerekiyor.
- Eksik finans, KPI, sponsor ve operasyon kararları tahmin edilmez; `BLOCKED`, `NOT_RUN`, `VERİ YOK` veya `KARAR BEKLİYOR` kalır.

## Faz 0 — Kanun, kapsam ve tek kayıt

**Amaç:** Proje sınırını ve kaynak gerçeğini sabitlemek.  
**Bağımlılık:** Yok.  
**Çıktı:** Tek görev kaydı, dosya sahipliği ve karar matrisi.

- [x] Repo, branch ve proje ayrılığı kanunu doğrulandı.
- [x] `docs/document-inventory.md` ve `docs/storage-and-repository-registry.md` kanonik kaynak yapıldı.
- [x] ST3.6 kontrol envanteri ve G0–G12 kapıları repo’ya alındı.
- [x] Görev sahipleri, rollback ve PR teslim şablonu belgelendi.
- [x] PR #83 review/CI sonucu ile main birleşmesi tamamlandı; merge commit `3521c24`.

**Dosyalar:** `docs/governance/`, `docs/document-inventory.md`, `docs/task-registry.md`, `docs/governance/st36/`.  
**Kabul:** Envanter, sahiplik, branch ve rollback bilgisi tek yerde; scope dışı dosya yok.

## Faz 1 — Kod iskeleti ve kalite kapıları

**Amaç:** Her sonraki değişikliğin ölçülebilir kalite sınırından geçmesi.  
**Bağımlılık:** Faz 0.

- [x] Next.js App Router, TypeScript strict ve klasör yapısı.
- [x] ESLint, Prettier, Vitest, build ve `npm run verify`.
- [x] GitHub CI: lint, typecheck, test, build, dependency audit, secret scan, Docker.
- [x] `.env.example` placeholder; gerçek secret yok.
- [x] Local doğrulama: lint, typecheck, 266 test, build, audit başarılı.
- [x] Güncel PR CI ve main CI kanıtı: Analyze, Docker, quality, dependency-audit ve secret-scan başarılı.

**Dosyalar:** `package.json`, `tsconfig.json`, `.github/workflows/`, `.env.example`, `src/`.  
**Kabul:** Tüm kalite işleri yeşil; secret veya müşteri verisi commit edilmemiş.

## Faz 2 — Veri modeli, Auth ve tenant güvenliği

**Amaç:** Kullanıcı, tenant, görev ve RLS sınırını üretime hazır hale getirmek.  
**Bağımlılık:** Faz 1.

- [x] Migration sırası ve tenant tabloları.
- [x] Profiles, tenant üyeliği ve rol modeli.
- [x] RLS politikaları ve server-only service role kullanımı.
- [x] İki production test kullanıcısı Tenant A/B’ye bağlandı.
- [ ] Kullanıcı A ile giriş ve yalnız A verisi testi.
- [ ] Kullanıcı B ile giriş ve yalnız B verisi testi.
- [ ] Çapraz tenant task erişimi `403/404` testi.
- [ ] Logout ve süresi dolmuş token testi.

**Dosyalar:** `supabase/migrations/`, `src/lib/auth/`, `src/lib/db/`, `src/app/api/`.  
**Kabul:** AUTH ve TENANT kontrollerinin tamamı PASS; aksi halde `NOT_RUN` veya `FAIL`.

## Faz 3 — Task, conversation ve approval API

**Amaç:** Kullanıcı hedefini güvenli ve izlenebilir bir görev sözleşmesine dönüştürmek.  
**Bağımlılık:** Faz 2.

- [x] Zod request/response şemaları.
- [x] Task, conversation, offer ve timeline endpoint’leri.
- [x] Tenant context ve authorization middleware.
- [~] `expected_output`, success criteria, approval state and route boundary tests are in PR #89; merge sonrası main doğrulaması bekliyor.
- [ ] API integration testleri: anonymous, invalid token, valid tenant, cross-tenant.
- [ ] OpenAPI/route sözleşmesi ve redacted error formatı.

**Dosyalar:** `src/app/api/tasks/`, `src/app/api/conversations/`, `src/lib/schemas/`, `src/server/`.  
**Kabul:** API sözleşmesi testli; başarısız görev sahte `completed` dönmez.

## Faz 4 — Inngest durable workflow

**Amaç:** `task.execute` olayından terminal duruma kadar dayanıklı yürütme.  
**Bağımlılık:** Faz 2 ve Faz 3.

- [x] Inngest endpoint ve function kaydı.
- [x] Plan, execute ve ordered step akışı.
- [x] Retry sınıfı ve `NonRetriableError` ayrımı.
- [x] Checkpoint, idempotency ve audit servisleri.
- [ ] Production app sync kanıtı.
- [ ] Gerçek `task.execute` trigger kanıtı.
- [ ] Worker terminal state kanıtı.
- [ ] Retry, duplicate event ve failure/blocked kanıtı.

**Dosyalar:** `src/inngest/`, `src/app/api/inngest/`, `src/server/services/checkpoint.service.ts`, `src/lib/db/`.  
**Kabul:** Her etkili step tekil checkpoint/audit üretir; duplicate yan etki oluşturmaz.

## Faz 5 — AI provider katmanı ve politika yönlendirmesi

**Amaç:** OpenAI ve Anthropic’i aynı güvenli adapter sözleşmesiyle çalıştırmak.  
**Bağımlılık:** Faz 4.

- [x] Provider interface ve mock adapter.
- [x] Policy tabanlı router ve model seçimi.
- [x] Timeout, retry, rate-limit ve redaction davranışı.
- [ ] OpenAI production test çağrısı.
- [ ] Anthropic production test çağrısı.
- [ ] Provider latency/token/cost redacted kanıtı.
- [ ] Credential yoksa `credential_not_configured` testi.

**Dosyalar:** `src/lib/ai/`, `src/lib/ai/ai-router.ts`, `src/__tests__/real-ai-providers.test.ts`.  
**Kabul:** Key yalnız server runtime’da; canlı çağrı kanıtı olmadan provider `COMPLETE` sayılmaz.

## Faz 6 — Checkpoint, audit, cost ve idempotency uzlaştırması

**Amaç:** Bir görevin sonucu, maliyeti ve geçmişi tek kanıt zincirinde birleşsin.  
**Bağımlılık:** Faz 4 ve Faz 5.

- [x] Audit ledger, cost tracker ve wallet temeli.
- [x] Task/step correlation ID.
- [x] Idempotency unique key ve duplicate koruması.
- [ ] Canlı task için checkpoint sayısı doğrulaması.
- [ ] Audit ile cost ledger eşleşmesi.
- [ ] Retry sonrası tek maliyet/tek yan etki doğrulaması.
- [ ] `FAILED`, `BLOCKED`, `WAITING_APPROVAL` state kanıtı.

**Dosyalar:** `src/lib/audit/`, `src/lib/cost/`, `src/server/services/`, `supabase/migrations/0002_idempotency.sql`.  
**Kabul:** Task maliyeti = ledger kaydı; duplicate veya kayıp audit yok.

## Faz 7 — Dış entegrasyonlar ve güvenli sınırlar

**Amaç:** Stripe, bildirim, analytics, realtime ve storage’ı proje sınırları içinde bağlamak.  
**Bağımlılık:** Faz 2, Faz 4 ve Faz 6.

- [x] Stripe sandbox adapter ve webhook imza kontrolü.
- [x] PostHog, notification ve realtime adapter sınırları.
- [x] Storage/repository registry ve tenant path kuralı.
- [ ] Stripe sandbox webhook replay kanıtı.
- [ ] Storage bucket/path RLS ve tenant negatif testi.
- [ ] PostHog/Sentry/Langfuse gerçek event kanıtı.
- [ ] Realtime bağlantı ve kopma davranışı kanıtı.

**Dosyalar:** `src/lib/integrations/`, `src/app/api/webhooks/stripe/`, `supabase/storage/`, `docs/storage-and-repository-registry.md`.  
**Kabul:** Gerçek ödeme yok; her connector ayrı credential/scope ve redacted evidence ile kabul edilir.

## Faz 8 — Beyaz/şeffaf MouseAI UI

**Amaç:** Verilen beyaz, şeffaf/frosted tasarım referansını çalışan ürüne uygulamak.  
**Bağımlılık:** Faz 3 temel API; diğer backend fazları UI geliştirmesini bloklamaz.

- [x] Design token temeli ve beyaz ana zemin.
- [ ] Sol navigasyon ve global arama.
- [ ] Çalışma Alanı dashboard ve AI ekip kartları.
- [ ] Görev gelen kutusu ve durum filtreleri.
- [ ] Task detail, timeline ve insan onayı kartı.
- [ ] Sağ canlı aktivite/devralma paneli.
- [ ] Maliyet, güvenlik, ayarlar ve entegrasyon ekranları.
- [ ] Responsive, keyboard navigation ve erişilebilirlik testi.

**Dosyalar:** `src/styles/`, `src/app/(dashboard)/`, `src/components/`, `docs/design/`.  
**Kabul:** Görsel referansla karşılaştırma; loading/empty/error/success durumları mevcut.

## Faz 9 — Observability, security ve release hardening

**Amaç:** Hata, AI trace, güvenlik ve release kanıtını üretim operasyonuna bağlamak.  
**Bağımlılık:** Faz 4–7.

- [x] Structured logger, error logger ve secret/PII redaction.
- [x] CodeQL, secret scan, dependency audit ve Docker workflow’ları.
- [~] Sentry/Langfuse/PostHog transport timeout hardening PR #90’da; canlı event/trace doğrulaması bekliyor.
- [ ] Langfuse provider/task trace doğrulaması.
- [ ] Threat model, attack-path ve RLS security review.
- [ ] Backup/restore ve rollback tatbikatı.
- [ ] Rate limit, timeout, kill switch ve incident runbook testi.

**Dosyalar:** `src/lib/logging/`, `src/lib/observability/`, `.github/codeql/`, `docs/security/`.  
**Kabul:** Kritik alert yok; secret, token, e-posta veya ham response loglanmıyor.

## Faz 10 — Ürün analitiği, KPI ve finans modeli

**Amaç:** Ürünün teknik olarak çalışmasının yanında ölçülebilir iş modeli oluşturmak.  
**Bağımlılık:** Faz 6 ve en az bir test/pilot akışı.

- [x] KPI kartları ve analytics event sözleşmesi.
- [ ] `task_created`, `task_started`, `task_completed`, `task_failed`, `approval_requested` event kanıtı.
- [ ] Başarı, latency, human handoff, retry ve maliyet baseline’ı.
- [ ] Düşük/temel/yüksek finans senaryosu.
- [ ] Tenant başına brüt katkı ve başa baş hesabı.
- [ ] Fiyat, SLA ve destek kararlarının kanıtla bağlanması.

**Dosyalar:** `src/lib/integrations/posthog-provider.ts`, `docs/governance/st36/MAUSEAI_KPI_Kartlari.json`, finans şablonları.  
**Kabul:** Eksik veri `VERİ YOK`; ölçülmemiş metrikle ticari iddia yok.

## Faz 11 — Pilot, bilgisayar runner ve ortak çalışma

**Amaç:** Kontrollü pilotta gerçek iş akışını, devralmayı ve geri almayı kanıtlamak.  
**Bağımlılık:** Faz 2, 4, 8 ve 9.

- [ ] Tek test tenant’ta API bakım pilotu.
- [ ] Windows runner gözlem→eylem→tekrar gözlem protokolü.
- [ ] Human approval, WAITING_INPUT ve WAITING_DEVICE akışları.
- [ ] UNKNOWN sonucu sorgulama ve verifier akışı.
- [ ] Bounded retry, rollback ve kill switch tatbikatı.
- [ ] İki kullanıcılı ortak görev ve devralma testi.
- [ ] Pilot sonuç raporu ve kabul sahibi.

**Dosyalar:** `docs/production-smoke-runbook.md`, `docs/production-acceptance-task-distribution.md`, runner/pilot dokümanları.  
**Kabul:** Gerçek müşteri verisi ve canlı ödeme olmadan redacted pilot kanıtı.

## Faz 12 — Hukuk, operasyon ve final production acceptance

**Amaç:** Ürünü işletilebilir, geri alınabilir ve kontrollü biçimde yayınlamak.  
**Bağımlılık:** Faz 0–11.

- [ ] Gizlilik, retention, silme, şartlar ve subprocessors belgeleri.
- [ ] SBOM, lisans, veri bölgesi ve sorumluluk matrisi.
- [ ] DNS, Vercel production, backup, incident ve destek devri.
- [ ] Auth PASS.
- [ ] Tenant isolation PASS.
- [ ] Inngest workflow/checkpoint/audit/retry PASS.
- [ ] Provider/cost/observability PASS.
- [ ] Production logs ve audit PASS.
- [ ] Final karar: `ACCEPT` veya kanıtlı `REJECT`.

**Dosyalar:** `docs/governance/st36/`, `docs/security/`, `docs/deploy/`, final acceptance evidence.  
**Kabul:** Dört ana kapı birlikte PASS olmadan production kabulü verilmez.

## Eski teknik dilimlerin yürütme sırası (ürün/gate sırası değildir)

```text
F0 Kanun/kayıt
 → F1 Kod/CI
 → F2 Auth/RLS/Tenant
 → F3 API sözleşmesi
 → F4 Inngest workflow
 → F5 AI provider
 → F6 Audit/Cost/Idempotency
 → F7 Entegrasyonlar/Storage/Stripe
 → F8 UI
 → F9 Security/Observability/Release
 → F10 KPI/Finans
 → F11 Pilot/Runner/Devralma
 → F12 Hukuk/Operasyon/Final kabul
```

## Teknik işlerde paralellik (gate geçişi sayılmaz)

Teknik dilimlerin bir kısmı paralel yürütülebilir. Bu, kanonik P0–P9
bağımlılıklarını veya G0–G12 kabul sırasını değiştirmez:

```text
G0–G8 ve P4 verifier/recovery kanıtı → izinli G9 pilot
G9 PASS + G0–G9 kanıtları → G10 teknik yayın kararı
G10 PASS + yetkili ticari/iç kullanım kararı → G11
G11 PASS + sürdürülebilir operasyon kanıtı → G12
P0 Auth/tenant PASS → bağımlı live Inngest acceptance
P0 provider + audit/cost evidence → real cost reconciliation
```

## Her fazın kapanış şablonu

```text
Faz:
Durum: PLANNED | IN_PROGRESS | CODE_COMPLETE_LIVE_TEST_PENDING | COMPLETE | BLOCKED
Sahip:
Branch:
PR:
Değişen dosyalar:
Testler:
Başarılı test sayısı:
Kanıt dosyası:
Secret durumu: configured | credential_not_configured
Rollback:
Kalan engel:
Sıradaki faz:
```

**Nihai kural:** Eski teknik faz tikleri gate geçirmez. Kanıt, credential,
canlı veri veya insan kararı gereken işler `credential_not_configured`,
`NOT_RUN`, `BLOCKED` veya `KARAR BEKLİYOR` olarak kaydedilir. G10 teknik yayın,
G11 ticari/yetkili iç kullanım ve G12 sürdürülebilir işletme ayrı kabul edilir.
