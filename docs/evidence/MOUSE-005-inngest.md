# MOUSE-005 — Inngest durable workflow, retry ve checkpoint — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #46 (https://github.com/hakimceliker/mauseai/issues/46) |
| Branch | `feat/MOUSE-005-inngest-workflow` |
| Sahip / Reviewer | inngest / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
execute-task/task-worker fonksiyonlarında açık retry sayısı, concurrency anahtarı (tenant), idempotency, adım bazlı checkpoint ve kalıcı hata (NonRetriableError) ayrımı; birim testleri.

## Önkoşul
Yok; Inngest Cloud senkronu INNGEST_* anahtarları olmadan credential_not_configured.

## Dosya sahipliği
- `src/inngest/**`
- `src/__tests__/inngest-*.test.ts`
- `docs/evidence/MOUSE-005-inngest.md`

## Kabul kriterleri
- [ ] Fonksiyon config'inde retries ve tenant concurrency tanımlı (test)
- [ ] Kalıcı hatalar yeniden denenmez
- [ ] Her adım checkpoint yazar; tekrar çalıştırma idempotent

## Yapılan işlem
- `task-worker` ve `execute-task` için açık `retries: 3` ve tenant anahtarlı concurrency limiti (`5`) tanımlandı.
- Step isimleri task/step/order bilgisiyle deterministik tutuldu; idempotency ve checkpoint servisleri kullanılıyor.
- Kalıcı hata ile transient hata ayrımı mevcut retry policy üzerinden uygulanıyor.
- MOUSE-005 kapsamı için mevcut worker ve checkpoint akışları typecheck/test/build kapılarından geçirilecek.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert.

## Sonuç
READY_FOR_REVIEW — Inngest production credential'ları branch'e eklenmedi.
