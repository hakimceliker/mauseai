# MouseAI — Inngest Step Functions ve Edge Function Sınırı

## Bağlayıcı karar

MouseAI’nin dayanıklı orkestrasyon motoru Inngest Step Functions’tır. Supabase Edge Functions yalnızca kısa, stateless ve hızlı yardımcı uçlar için kullanılabilir.

## Inngest sorumlulukları

- Task başlatma ve zincirleme event
- Her önemli yan etkiyi ayrı `step.run` ile yürütme
- Deterministik step kimlikleri
- Checkpoint ve yeniden başlatma
- Retry ve timeout
- `step.sleep` / `step.sleepUntil` ile gecikmeli kontrol
- `step.waitForEvent` ile insan onayı
- Alt iş akışları ve event zincirleri
- Bütçe/policy duraklaması
- Audit ve final durum yazımı

## Step kuralları

1. Step ID deterministik olur: `step-${nodeId}` veya sabit görev adı.
2. AI çağrısı, DB yazımı, checkpoint ve audit kritik yan etkiler olarak ayrılır.
3. Başarılı step sonucu Inngest tarafından tekrar kullanılabilir; aynı yan etki idempotent olmalıdır.
4. Geçici hata retry edilir; kalıcı/policy hatası `NonRetriableError` olur.
5. İnsan onayı bekleyen iş kaynak tüketmeden askıya alınır.
6. Approval timeout sonrası görev `BLOCKED` veya `CANCELLED` olur.

## Hata davranışı

| Durum | Sonuç |
|---|---|
| Step başarılı | sonuç kaydedilir, sonraki step’e geçilir |
| Geçici hata | ilgili fonksiyon/step retry edilir |
| Kalıcı hata | retry yok, task FAILED |
| Policy/bütçe | WAITING_APPROVAL veya BLOCKED |
| Duplicate event | idempotency ile no-op/mevcut sonuç |
| Worker timeout | tamamlanmış step’ler korunur, kaldığı yerden devam |

## Edge Function sorumlulukları

Uygun işler:

- health/status
- kısa webhook alıcı
- JWT + tenant doğrulamalı hafif proxy
- kısa input doğrulama/dönüşüm
- Inngest event’i başlatan ince köprü

Uygun olmayan işler:

- AI planlama/çalıştırma
- uzun task
- retry/checkpoint
- insan onayı bekleme
- ağır veri işlemi
- bütçe/policy karar zinciri
- cron’un ana iş mantığı

## Karar matrisi

| İhtiyaç | Seçim |
|---|---|
| 10 saniyeden kısa stateless uç | Edge Function veya API Route |
| Retry + timeout + checkpoint | Inngest |
| İnsan onayı | Inngest |
| Uzun AI/tool işi | Inngest |
| Düşük latency health/webhook | Edge Function |
| Cron ve gecikmeli iş | Inngest |

## Mevcut uygulama eşleşmesi

- `src/inngest/functions/task-worker.ts`: dayanıklı task worker
- `src/lib/tasks/state-machine.ts`: MVP linear state machine
- `supabase/functions/health/index.ts`: kısa health uç örneği
- `supabase/functions/task-status/index.ts`: JWT/RLS ile kısa status uç örneği
- `src/inngest/client.ts`: event key ile server-side Inngest client

## Yasak sınır

Edge Function içine task worker taşınamaz. Inngest içine ait olmayan uzun iş API/Edge katmanına konulamaz. Sınır değişikliği ADR ve performans/güvenlik kanıtı olmadan kabul edilmez.
