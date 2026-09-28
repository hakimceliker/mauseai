# MOUSE-001 — Kod iskeleti ve kalite kapıları — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #42 (https://github.com/hakimceliker/mauseai/issues/42) |
| Branch | `feat/MOUSE-001-code-skeleton` |
| Sahip / Reviewer | claude / hakimceliker |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
Main'deki CI kapılarını (lint, typecheck, test, build, npm audit, gitleaks, Docker) doğrula ve boşlukları kapat: typecheck `tests/` klasörünü de kapsasın, tek komutla yerel doğrulama (`npm run verify`), PR şablonunda kapı kontrol listesi.

## Önkoşul
PR #41 merged, main CI yeşil (run 117).

## Dosya sahipliği
- `.github/workflows/ci.yml`
- `.github/pull_request_template.md`
- `tsconfig.json`
- `package.json (yalnızca scripts)`
- `docs/evidence/MOUSE-001-code-skeleton.md`

## Kabul kriterleri
- [ ] CI'da 5 iş (quality, dependency-audit, secret-scan, docker) PR'da çalışır ve yeşildir
- [ ] `npm run typecheck` tests/ dahil hatasız
- [ ] `npm run verify` lint+typecheck+test+build'i sırayla çalıştırır
- [ ] PR şablonu 7 kapıyı ve secret/ödeme kurallarını listeler

## Yapılan işlem
- `npm run verify` komutu eklendi; lint, typecheck, test ve build'i sıralı çalıştırır.
- TypeScript kapsamına `tests/**/*` eklendi.
- PR şablonuna kalite, güvenlik, secret ve rollback kapıları eklendi.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
Yerel uygulama doğrulaması commit öncesi çalıştırıldı; GitHub CI sonuçları PR üzerinde takip edilecek.

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert; CI dosyası önceki commit'e döner.

## Sonuç
READY_FOR_REVIEW
