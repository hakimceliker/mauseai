# MOUSE-008 — Stripe sandbox — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #49 (https://github.com/hakimceliker/mauseai/issues/49) |
| Branch | `feat/MOUSE-008-stripe-sandbox` |
| Sahip / Reviewer | stripe / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
Stripe adapter'ı yalnızca test modunda çalışsın: `sk_live_`/`rk_live_` anahtarları ve livemode=true webhook olayları reddedilir (`live_mode_not_approved`); sandbox testleri.

## Önkoşul
Yok; STRIPE_SECRET_KEY yoksa credential_not_configured. Canlı mod kullanıcı kapısıdır.

## Dosya sahipliği
- `src/lib/integrations/payment-adapter.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/__tests__/lib/integrations/stripe-sandbox.test.ts`
- `docs/evidence/MOUSE-008-stripe.md`

## Kabul kriterleri
- [ ] Canlı anahtar ile adapter oluşturulamaz
- [ ] livemode=true webhook 4xx döner ve wallet'a yazmaz
- [ ] Test anahtarı ile mevcut akış bozulmaz

## Yapılan işlem
- `sk_live_` ve `rk_live_` credential'ları provider oluşturulmadan reddediliyor.
- `livemode=true` webhook olayları wallet yazımı öncesinde 403 ile durduruluyor.
- Sandbox koruması için anahtar türü ve provider oluşturma testleri eklendi.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert.

## Sonuç
READY_FOR_REVIEW — canlı Stripe credential'ı veya gerçek ödeme kullanılmadı.
