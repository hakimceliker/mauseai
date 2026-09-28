# MOUSE-010 — Sentry/Langfuse hata ve trace — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #51 (https://github.com/hakimceliker/mauseai/issues/51) |
| Branch | `feat/MOUSE-010-error-trace` |
| Sahip / Reviewer | observability / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | IN_PROGRESS |

## Kapsam
Hata raporlama (Sentry envelope API) ve AI trace (Langfuse ingestion API) adapter'ları; DSN/anahtar yoksa credential_not_configured ve no-op; hassas veri maskeleme; AI router'a trace kancası.

## Önkoşul
Yok; SENTRY_DSN, LANGFUSE_* yoksa credential_not_configured.

## Dosya sahipliği
- `src/lib/observability/**`
- `src/__tests__/observability.test.ts`
- `docs/evidence/MOUSE-010-error-trace.md`

## Kabul kriterleri
- [ ] DSN yoksa ağ çağrısı yok, durum credential_not_configured
- [ ] Gönderilen yükte e-posta/anahtar/Bearer maskeli (test)
- [ ] Rapor hatası uygulamayı düşürmez

## Yapılan işlem
_Uygulama commit'leriyle doldurulacak._

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert.

## Sonuç
IN_PROGRESS
