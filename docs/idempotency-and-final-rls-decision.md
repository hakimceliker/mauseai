# MouseAI — Idempotency ve Final RLS Kararı

## Idempotency

- API anahtarı: `Idempotency-Key` header
- Format: `{tenantId}:{resource}:{action}:{uniqueRef}`
- Saklama: 24 saat
- Aynı key + aynı body: önceki cevap döner
- Aynı key + farklı body: `409 Conflict`
- Checkpoint: `task_id + step_id + version` unique
- Worker checkpoint yazımı: upsert
- Step ID’leri: deterministik

## Retry

- Transient hata: normal throw, Inngest retry
- Validation/forbidden/budget: `NonRetriableError`
- Business approval: `WAITING_APPROVAL` veya `BLOCKED`
- Her retry/final failure: audit event

## RLS

RLS final paketi `profiles.user_id` şemasına göre uygulanmıştır. Audit kullanıcı tarafından yazılamaz; idempotency kayıtları yalnızca tenant kapsamında okunur/yazılır; service role yalnızca server-side worker’da kullanılır.
