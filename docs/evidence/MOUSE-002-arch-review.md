# MOUSE-002 — Mimari inceleme standardı — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #43 (https://github.com/hakimceliker/mauseai/issues/43) |
| Branch | `feat/MOUSE-002-arch-review-standard` |
| Sahip / Reviewer | claude / hakimceliker |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
Her PR için Claude mimari/güvenlik inceleme standardı: bulgu seviyeleri, tenant/RLS, secret, idempotency, hata yönetimi, test ve rollback kontrol listesi; merge kararı formatı.

## Önkoşul
Yok (bağımsız).

## Dosya sahipliği
- `docs/review/architecture-review-standard.md`
- `docs/evidence/MOUSE-002-arch-review.md`

## Kabul kriterleri
- [ ] Bulgu seviyeleri (BLOCKER/HIGH/MEDIUM/LOW) tanımlı
- [ ] Tenant izolasyonu, RLS, secret, idempotency, hata, gözlemlenebilirlik maddeleri var
- [ ] Merge kararı şablonu var
- [ ] Belge envanterine ve görev defterine işlenmiş

## Yapılan işlem
- `docs/review/architecture-review-standard.md` bulgu seviyelerini, güvenlik/tenant/idempotency/observability kontrollerini ve merge şablonunu tanımlar.
- Belge, her PR için uygulanabilir kanıt listesi ve rollback alanı içerir.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert; yalnızca belge.

## Sonuç
READY_FOR_REVIEW — inceleme standardı doküman olarak tamamlandı.
