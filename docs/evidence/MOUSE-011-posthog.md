# MOUSE-011 — PostHog analitik — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #52 (https://github.com/hakimceliker/mauseai/issues/52) |
| Branch | `feat/MOUSE-011-posthog-analytics` |
| Sahip / Reviewer | observability / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
Analitik sağlayıcısına PostHog uygulaması (capture API), POSTHOG_KEY yoksa credential_not_configured, PII (e-posta, ad) gönderilmez, tenant grubu.

## Önkoşul
Yok; POSTHOG_KEY yoksa credential_not_configured.

## Dosya sahipliği
- `src/lib/integrations/posthog-provider.ts`
- `src/lib/integrations/analytics-provider.ts (fabrika)`
- `src/__tests__/lib/integrations/posthog-provider.test.ts`
- `docs/evidence/MOUSE-011-posthog.md`

## Kabul kriterleri
- [ ] ANALYTICS_TYPE=posthog ile seçilir
- [ ] Yükte e-posta/ad yok (test)
- [ ] Anahtar yoksa ağ çağrısı yok

## Yapılan işlem
- `PostHogAnalyticsProvider` capture API ile eklendi ve `ANALYTICS_TYPE=posthog` seçeneği bağlandı.
- `POSTHOG_KEY` yoksa ağ çağrısı yapılmıyor; provider sağlıklı değil olarak raporlanıyor.
- E-posta ve ad gibi doğrudan PII alanları capture özelliklerinden çıkarılıyor.
- Ağ/analitik hataları ürün isteğini düşürmüyor.
- Provider davranışı için üç test eklendi.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert.

## Sonuç
READY_FOR_REVIEW — gerçek PostHog anahtarı branch'e eklenmedi.
