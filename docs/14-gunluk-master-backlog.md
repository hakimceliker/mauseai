# MouseAI — 14 Günün Tam Uygulama Backlog’u

Bu belge eski bir teknik backlog taslağıdır; gün numaraları takvim taahhüdü,
proje süresi veya bağlayıcı ana yol haritası değildir. Yalnız P0/P1 içinde
onaylanan bir uygulama dilimi olarak kullanılabilir ve ilgili G0–G12 geçiş
kapılarına tabidir. Buradaki tik/teslim ifadesi tek başına gerçek uygulama veya
kabul kanıtı değildir. Kanonik ürün sırası:
[`mouseai-master-phase-plan-v1.0.md`](mouseai-master-phase-plan-v1.0.md).

## Ortak kurallar

- MVP’de yalnızca Next.js, Supabase, Inngest, basit custom state machine, Vercel AI SDK mock provider ve Zod kullanılır.
- BullMQ, gerçek GPT/Claude, gerçek ödeme ve gerçek connector’lar Faz 2/3’tür.
- GPT/Kodex üretim ve entegrasyon sahibidir.
- Claude/Claude Code denetim, refactor ve risk kontrol sahibidir.
- Her değişiklik test, audit ve görev kanıtı üretir.
- Yetki verilmemiş işlem `BLOCKED` olur.

## Gün 1 — Repo ve kalite kapıları

**Sahip:** GPT/Kodex  **Denetçi:** Claude  **Araç:** Cursor, GitHub, Next.js, TypeScript, Vercel, Supabase

- Next.js App Router ve TypeScript strict
- ESLint, Prettier, Husky ve güvenli env şablonu
- Git repo, branch politikası ve README
- Vercel/Supabase bağlantı noktalarının tanımı

**Dosyalar:** `package.json`, `tsconfig.json`, `app/`, `.env.example`, `.gitignore`  
**Kabul:** build/lint/typecheck çalışır; secret repoya girmez.

## Gün 2 — Domain sözleşmeleri

**Sahip:** GPT/Kodex  **Denetçi:** Claude  **Araç:** Cursor, Zod

- Task, Workflow, Step, Checkpoint, AuditEvent tipleri
- Task/Step/Risk/Actor enum’ları
- CreateTask, Task, Step, Checkpoint ve Audit Zod şemaları
- Ortak index export’ları

**Dosyalar:** `src/types/`, `src/lib/schemas/`  
**Kabul:** geçerli/geçersiz örnekler runtime validation’dan ayrılır.

## Gün 3 — Task API

**Sahip:** GPT/Kodex  **Denetçi:** Claude  **Araç:** Next Route Handlers, Supabase

- `POST /api/tasks`
- `GET /api/tasks/[id]`
- `POST /api/tasks/[id]/cancel`
- Tenant ve kullanıcı bağlamı
- Zod input doğrulama

**Kabul:** yetkili kullanıcı görev oluşturur/görüntüler/iptal eder; başka tenant’a erişemez.

## Gün 4 — Veritabanı, Auth, RLS ve temel güvenlik

**Sahip:** GPT/Kodex  **Denetçi:** Claude + Security

- `tenants`, `profiles`, `tasks`, `workflows`, `steps`, `checkpoints`, `audit_logs`, `conversations`, `messages`, `offers`
- UUID, timestamp, index ve foreign key’ler
- Supabase Auth, owner/admin/member rolleri
- `current_tenant_id()` ve `current_user_role()` helper fonksiyonları
- Tüm tablolarda RLS, tenant izolasyonu ve deny-by-default
- Service role yalnızca server-side worker’da
- Migration ve seed

**Kabul:** migration tekrarlanabilir; kimliksiz ve yanlış tenant erişimi engellenir; service role frontend’e çıkmaz.

## Gün 5 — Queue, worker ve checkpoint

**Sahip:** GPT/Kodex  **Denetçi:** Claude

- Inngest event sözleşmesi
- Task worker
- Basit state machine
- Step tamamlandığında Supabase checkpoint yazımı
- Worker’ın yalnızca kontrollü server-side erişimi

**Kabul:** görev kuyruğa girer, step çalışır ve state kalıcı yazılır.

## Gün 6 — Retry, timeout, idempotency

**Sahip:** GPT/Kodex  **Denetçi:** Claude

- Inngest retry ve timeout
- `task_id + step_id` idempotency anahtarı
- Hata sınıfları: geçici, kalıcı, onay gerektiren
- Pause/resume ve cancel kontrolü

**Kabul:** aynı step tekrarlandığında yan etki iki kez oluşmaz; başarısız iş kontrollü durur.

## Gün 7 — Mock AI Router

**Sahip:** GPT/Kodex  **Denetçi:** Claude

- Mock GPT provider
- Mock Claude provider
- `AIRouter` seçim sınıfı
- Görev/risk/maliyet bilgisine göre provider seçimi
- Provider timeout ve fallback

**Kabul:** aynı sözleşmeyle mock GPT ve mock Claude çağrılır; cevap audit’e yazılır.

## Gün 8 — Maliyet ve limit

**Sahip:** GPT/Kodex  **Denetçi:** Claude + Finance policy

- Token simülasyonu
- `cost_cents` hesaplama
- Tenant günlük kredi limiti
- Görev bütçesi
- Limit aşımında `WAITING_APPROVAL` veya `BLOCKED`

**Kabul:** limit aşımı yeni provider çağrısını durdurur ve audit kaydı oluşturur.

## Gün 9 — Audit ve event ledger

**Sahip:** GPT/Kodex  **Denetçi:** Claude + Security

- Değişmez audit event yazıcı
- Actor, action, resource, risk ve maliyet
- Task/step/provider/worker event’leri
- Raporlanabilir event sorguları

**Kabul:** her kritik işlem kim, ne yaptı, ne zaman, hangi maliyetle bilgisiyle okunabilir.

## Gün 10 — Conversation ve e-posta mock

**Sahip:** GPT/Kodex  **Denetçi:** Claude

- `conversations` ve `messages`
- E-posta normalize mock adapter
- Conversation state machine
- Niyet sınıfları: satış, destek, iade, ödeme, şikâyet
- SLA ve son işlem zamanı

**Kabul:** mock e-posta doğru tenant Conversation kaydına dönüşür ve durum değiştirir.

## Gün 11 — Offer ve Policy Engine

**Sahip:** GPT/Kodex  **Denetçi:** Claude + Finance policy

- `offers` tablosu ve sözleşmesi
- Liste fiyatı, minimum fiyat, indirim tavanı, marj
- Mock GPT teklif taslağı
- Mock Claude teklif denetimi
- `HUMAN_APPROVAL_REQUIRED`

**Kabul:** politika dışı teklif gönderilemez; teklif gerekçesi ve risk seviyesi kaydedilir.

## Gün 12 — Güvenlik sertleştirme ve negatif testler

**Sahip:** GPT/Kodex + Security  **Denetçi:** Claude

- Secret ve `.env` taraması
- Hassas verinin log’a düşmeme kontrolü
- Prompt injection temel koruması
- Yetkisiz araç ve yüksek riskli işlem denemeleri
- Yanlış tenant, eksik token ve yanlış rol testleri
- Service role’un client’tan çağrılma girişimi testi
- Güvenlik kabul raporu

**Kabul:** tüm negatif testler beklenen şekilde engellenir; kritik güvenlik açığı kalmaz; kabul raporu docs’a yazılır.

**Test dosyası:** `tests/security/rls-negative.test.ts`  
**Kabul raporu:** `docs/security-acceptance-report.md`

**Performans ve Edge standardı:** `docs/security/rls-performance-and-edge-functions.md`

**Secret ve zamanlama standardı:** `docs/security/secret-management-and-inngest-scheduling.md`

## Gün 13 — Entegrasyon ve hata testleri

**Sahip:** QA agent  **Uygulama:** GPT/Kodex  **Denetçi:** Claude

- Unit test: schema, policy, cost, idempotency
- Integration test: API + Supabase + worker
- E2E: hedef → task → checkpoint → devam → audit → maliyet → rapor
- Hata: timeout, provider failure, limit, cancel, duplicate event

**Kabul:** kritik akışlar otomatik testle kanıtlanır; açık kritik hata kalmaz.

## Gün 14 — Demo, runbook ve sürüm

**Sahip:** GPT/Kodex  **Denetçi:** Claude + insan onayı

- Hedef giriş ekranı
- Task listesi ve step durumu
- Checkpoint/retry görünümü
- Audit/maliyet raporu
- README ve runbook
- Kabul raporu ve bilinen sınırlamalar
- `v0.1.0` sürüm etiketi

**Kabul:** demo baştan sona çalışır; test, güvenlik ve doküman kanıtları tamamdır.

## Teslim sırası

Gün 1–4 temel uygulama ve veri; Gün 5–9 yürütme ve denetim; Gün 10–11 müşteri/teklif; Gün 12 güvenlik; Gün 13 kalite; Gün 14 demo ve release.

## 14 gün sonunda teslim edilecek dosya grupları

```text
app/                         web ve API
src/types/                   domain sözleşmeleri
src/lib/schemas/             Zod doğrulamaları
src/lib/tasks/               task ve state machine
src/lib/ai/                  mock providers ve router
src/lib/policy/              risk, limit ve teklif politikaları
src/lib/audit/               audit/event writer
src/lib/conversations/       e-posta ve müşteri modeli
src/lib/cost/                maliyet hesaplama
src/inngest/                 event ve worker fonksiyonları
supabase/migrations/         SQL ve RLS
tests/                       unit/integration/e2e
docs/                        runbook, kabul ve karar kayıtları
```

## Otomatik durma kapıları

Sistem yalnızca şu durumlarda kullanıcı onayı ister: gerçek API anahtarı kaydetme, canlı ödeme, production deploy, müşteri adına bağlayıcı mesaj, veri silme, kripto/para transferi ve güvenlik politikasını değiştirme.
