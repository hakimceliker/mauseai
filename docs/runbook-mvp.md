# MouseAI Core MVP Runbook

## Başlatma öncesi

1. Supabase project URL ve anon key ortamda.
2. Service role yalnızca server ortamında.
3. Migration `0001_core.sql` test Supabase’te uygulanmış.
4. Inngest event/signing key server ortamında.
5. Gerçek AI anahtarları MVP’de kapalı; mock provider kullanılıyor.

## Sağlık kontrolü

- `GET /api/health` — liveness: süreç ayakta mı (her zaman 200).
- `GET /api/health/ready` (veya `HEAD`) — readiness: trafik alınabilir mi. Tüm kontroller geçerse 200, biri `fail` ise 503 döner.
  - `config`: `ALLOWED_ORIGINS`, `LOG_LEVEL`, `LOG_FORMAT` Zod doğrulaması.
  - `database`: Supabase yapılandırılmışsa `/rest/v1/` erişimi; mock modda `skipped`.
  - `auth`: `AUTH_PROVIDER=supabase` ise `/auth/v1/health` erişimi; `mock` ise `ok`.
  - `inngest`: event + signing key; yalnızca `VERCEL_ENV=production` ise zorunlu, aksi halde `skipped`.
  - Her dış kontrol 3 sn zaman aşımına sahip; yanıtlar secret içermez ve önbelleğe alınmaz.
- `GET /api/inngest`
- Supabase migration ve RLS testleri
- Worker loglarında secret bulunmaması

## Demo akışı

1. Authenticated tenant kullanıcısı hedef gönderir.
2. Task, workflow ve step oluşur.
3. Inngest worker mock AI çağırır.
4. Cost event, audit ve checkpoint yazılır.
5. Task tamamlanır; hata olursa retry/blocked durumu görünür.

## Rollback

- Yeni deploy’u durdur.
- Worker event’lerini askıya al.
- Son başarılı sürüme dön.
- Migration geri alma planı olmadan tablo silme yapma.
- Audit ve checkpoint kayıtlarını koru.
