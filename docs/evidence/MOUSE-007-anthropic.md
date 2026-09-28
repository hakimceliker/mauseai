# MOUSE-007 — Anthropic adapter — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #48 (https://github.com/hakimceliker/mauseai/issues/48) |
| Branch | `feat/MOUSE-007-anthropic-adapter` |
| Sahip / Reviewer | anthropic / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | IN_PROGRESS |

## Kapsam
Anthropic adapter'ını resmi `@anthropic-ai/sdk` ile yeniden yaz: güncel model (`claude-opus-5`, env ile değiştirilebilir), timeout/maxRetries, refusal/stop_reason işleme, token ve maliyet ölçümü; testler.

## Önkoşul
Yok; ANTHROPIC_API_KEY yoksa credential_not_configured.

## Dosya sahipliği
- `src/lib/ai/providers/anthropic.ts`
- `src/__tests__/anthropic-provider.test.ts`
- `package.json / package-lock.json (yalnızca @anthropic-ai/sdk)`
- `docs/evidence/MOUSE-007-anthropic.md`

## Kabul kriterleri
- [ ] SDK kullanılır, ham fetch yok
- [ ] Model env ile seçilir, varsayılan claude-opus-5
- [ ] Timeout ve retry SDK ayarlarıyla
- [ ] Anahtar yoksa CREDENTIAL_NOT_CONFIGURED; hata anahtar içermez

## Yapılan işlem
_Uygulama commit'leriyle doldurulacak._

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert; bağımlılık kaldırılır.

## Sonuç
IN_PROGRESS
