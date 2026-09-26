# MouseAI — Gün 12 Güvenlik Kabul Raporu

**Durum:** Hazırlanacak test kanıtı bekleniyor  
**Kapsam:** Gün 4 temel güvenlik + Gün 12 sertleştirme  
**Test dosyası:** `tests/security/rls-negative.test.ts`

## Kabul kontrol listesi

- [ ] Kimliksiz `/api/tasks` isteği 401 döndürüyor.
- [ ] Geçersiz token 401 döndürüyor.
- [ ] Başka tenant task’ı 403/404 ile gizleniyor.
- [ ] Member tenant güncellemesi reddediliyor.
- [x] `NEXT_PUBLIC_*` altında service role değişkeni bulunmuyor.
- [ ] Prompt injection biçimli hedef güvenli şekilde işaretleniyor veya policy kontrolüne gidiyor.
- [ ] Kullanıcı `audit_logs` tablosuna yazamıyor.
- [ ] Secret ve `.env` taraması temiz.
- [ ] Hassas token ve müşteri verisi loglara yazılmıyor.
- [ ] RLS policy’leri yanlış tenant erişimini engelliyor.
- [ ] Service role yalnızca server-side worker’da kullanılıyor.
- [ ] Secret yönetimi ve Inngest zamanlama standardı uygulanıyor.
- [ ] Kritik RLS sorguları `EXPLAIN ANALYZE` ile index kullanıyor.
- [ ] Edge Function varsa JWT, tenant, Zod, CORS ve redacted log kontrolleri geçiyor.

## Kanıt koşulu

`SECURITY_E2E=1` ile güvenlik testleri gerçek Supabase/Auth test ortamında çalıştırılmadan rapor tamamlandı sayılmaz. Test ortamı production verisi kullanmaz.

## Açık riskler

- Uzak Supabase migration uygulaması henüz doğrulanmadı.
- Gerçek Auth token’ları ve test tenant’ları henüz tanımlanmadı.
- Prompt injection policy engine’i MVP’de temel seviyededir.
- Edge Function katmanı MVP kapsamı dışındadır; Faz 2 standardı `docs/security/rls-performance-and-edge-functions.md` dosyasındadır.
- Secret ve zamanlama standardı `docs/security/secret-management-and-inngest-scheduling.md` dosyasındadır.
