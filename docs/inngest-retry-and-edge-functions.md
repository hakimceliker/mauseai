# MouseAI — Inngest Retry ve Edge Function Uygulama Standardı

## Retry sınıfları

| Hata | Örnek | Davranış |
|---|---|---|
| Geçici | timeout, 429, 502/503/504 | Inngest retry, en fazla 3 |
| Kalıcı | validation, 400, 404 | `NonRetriableError`, tekrar yok |
| Policy/onay | bütçe, L3/L4 | retry yok, `WAITING_APPROVAL`/`BLOCKED` |
| Idempotent çakışma | aynı task/step | no-op veya mevcut sonuç |

## Standart değerler

- Task worker: 3 retry, concurrency 10
- Checkpoint yazımı: kritik step ve audit
- İnsan onayı: retry yok, timeout sonrası BLOCKED
- AI/tool adımı: 30–60 saniye timeout hedefi
- Her retry/final fail audit event’i oluşturur.

## Edge Function sınırı

Edge Function yalnızca kısa, stateless, JWT doğrulamalı ve Zod kontrollü işler içindir. Uzun iş, AI çağrısı, retry, checkpoint, ağır veri işlemi ve cron Inngest worker’da yürütülür.

Hazırlanan örnekler:

- `supabase/functions/health/index.ts`
- `supabase/functions/task-status/index.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/supabase.ts`

Production’da CORS allowlist zorunludur; wildcard kullanılmaz. Service role yalnızca admin helper içinde okunur ve client’a dönülmez.

Detaylı step/Edge sınır kararı: `docs/inngest-step-functions-and-edge-boundary.md`.
