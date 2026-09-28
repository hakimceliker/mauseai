# MOUSE-003 — Supabase migration, RLS ve Auth — Kanıt ve Teslim Raporu

| Alan | Değer |
|---|---|
| Issue | #44 (https://github.com/hakimceliker/mauseai/issues/44) |
| Branch | `feat/MOUSE-003-supabase-migration` |
| Sahip / Reviewer | supabase / claude |
| Aşama | Aşama 1 (bağımsız paket) |
| Durum | IN_PROGRESS |

## Kapsam
Migration'lar için statik RLS kapısı: her `create table` için RLS etkin ve en az bir policy var, tenant_id taşıyan tablolarda tenant filtresi var; 0007 numara boşluğunun belgelenmesi; migration kontrol testleri CI'da.

## Önkoşul
Yok; gerçek Supabase projesine uygulama kullanıcı onayı ister (credential_not_configured).

## Dosya sahipliği
- `tests/security/migration-rls.test.ts`
- `supabase/migrations/README.md`
- `docs/evidence/MOUSE-003-supabase.md`

## Kabul kriterleri
- [ ] Test tüm migration'ları tarar; RLS'siz tablo varsa kırılır
- [ ] Numara boşluğu ve uygulama sırası README'de
- [ ] Canlı DB'ye hiçbir şey uygulanmaz

## Yapılan işlem
_Uygulama commit'leriyle doldurulacak._

## Testler ve sonuçlar
Zorunlu kapılar: lint, typecheck, test, build, npm audit, gitleaks secret scan, Docker build.
_Sonuçlar uygulama commit'iyle eklenecek._

## Credential durumu
Gerçek anahtar gerektiren noktalar `credential_not_configured` olarak raporlanır; secret istenmez ve yazılmaz.

## Rollback
PR revert; şema değişmez (yalnızca test/belge).

## Sonuç
IN_PROGRESS
