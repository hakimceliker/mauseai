# MOUSE-006 — OpenAI adapter — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #47 (https://github.com/hakimceliker/mauseai/issues/47) |
| Branch | `feat/MOUSE-006-openai-adapter` |
| Sahip / Reviewer | openai / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | IN_PROGRESS |

## Kapsam
OpenAI adapter'ına zaman aşımı, 429/5xx için sınırlı yeniden deneme, hata gövdesinden sır sızmasını önleme, env ile fiyat/model; testler (mock fetch).

## Önkoşul
Yok; OPENAI_API_KEY yoksa credential_not_configured.

## Dosya sahipliği
- `src/lib/ai/providers/openai.ts`
- `src/lib/ai/providers/request-policy.ts`
- `src/__tests__/openai-provider.test.ts`
- `docs/evidence/MOUSE-006-openai.md`

## Kabul kriterleri
- [ ] Timeout AbortSignal ile uygulanır
- [ ] 429/5xx en fazla N kez yeniden denenir, 4xx denenmez
- [ ] Hata mesajı anahtar içermez
- [ ] Anahtar yoksa CREDENTIAL_NOT_CONFIGURED

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
