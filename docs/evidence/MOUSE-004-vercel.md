# MOUSE-004 — Vercel deployment — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #45 (https://github.com/hakimceliker/mauseai/issues/45) |
| Branch | `feat/MOUSE-004-vercel-deployment` |
| Sahip / Reviewer | vercel / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | READY_FOR_REVIEW |

## Kapsam
`vercel.json` (Inngest ve AI rotaları için maxDuration, bölge), preview/production env sözleşmesi ve deployment kontrol listesi; konfig testi.

## Önkoşul
Yok; gerçek deploy/domain kullanıcı onayı ister.

## Dosya sahipliği
- `vercel.json`
- `docs/deploy/vercel-deployment.md`
- `tests/unit/vercel-config.test.ts`
- `docs/evidence/MOUSE-004-vercel.md`

## Kabul kriterleri
- [ ] vercel.json şemaya uygun, fonksiyon yolları mevcut rotalara eşleşir (test)
- [ ] Env listesi yalnızca ad içerir, değer içermez
- [ ] Rollback prosedürü yazılı

## Yapılan işlem
- `vercel.json` ile Next.js framework, `fra1` bölgesi ve Inngest/task function süre sınırları tanımlandı.
- Production env sözleşmesi ve rollback prosedürü `docs/deploy/vercel-deployment.md` içine yazıldı.
- Config ve secret-value kapısı `tests/unit/vercel-config.test.ts` ile doğrulanıyor.

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
vercel.json silinir/revert; Vercel varsayılanlarına döner.

## Sonuç
READY_FOR_REVIEW — Vercel dashboard credential/deployment işlemleri bu branch'ten otomatik yapılmadı.
