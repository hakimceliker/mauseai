# MouseAI — Production kurulumu (Vercel, domain, DNS, SSL)

Bu belge gerçek sağlayıcılarla production'a çıkış adımlarını anlatır. Hiçbir sır değeri bu repoda, belgede veya logda bulunmaz; değerler yalnızca Vercel ortam değişkenlerine girilir.

> Durum: Kod tarafı hazırdır, ancak gerçek anahtarlar ve production ortamı doğrulanmadan sistem **production-ready sayılmaz**. Aşağıdaki "Çıkış doğrulaması" adımlarının hepsi geçmelidir.

## 1. Çalışma modu kuralı

| Mod | Ne zaman | Mock sağlayıcı | Eksik anahtar |
|---|---|---|---|
| `test` | `NODE_ENV=test` veya Vitest | izinli | mock ile devam |
| `development` | yerel `next dev` | izinli | mock ile devam |
| `production` | `NODE_ENV=production` (Vercel Production **ve Preview** build'leri) | **yasak** | açık hata: `503 ai_provider_not_configured`, `503 crm_not_configured`, `channel_not_configured` |

Preview ortamı da `NODE_ENV=production` ile çalışır. Preview'da gerçek anahtar istemiyorsanız, Preview için ayrı ve düşük limitli anahtarlar tanımlayın; aksi hâlde AI uç noktaları 503 döner (bu beklenen, güvenli davranıştır).

## 2. Ortam değişkenleri (Vercel → Project → Settings → Environment Variables)

Yalnızca adlar listelenir. Tam liste ve açıklamalar: `.env.example`, `INTEGRATION_SETUP.md`.

**Kritik (eksikse `/api/ops/config` `ready: false` döner ve açılışta `production_config_incomplete` loglanır):**

- `NEXT_PUBLIC_SUPABASE_URL` (https olmalı), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `OPENAI_API_KEY` ve/veya `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` **veya** `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel Marketplace → Upstash Redis entegrasyonu bunları otomatik ekler)
- `NEXT_PUBLIC_` önekli hiçbir değişken sır içermemeli (`..._SECRET`, `..._TOKEN`, `..._API_KEY`, `SERVICE_ROLE`); kontrol bunu yakalar.

**Önerilen:** `OPENAI_PRICE_INPUT_CENTS_PER_1M`, `OPENAI_PRICE_OUTPUT_CENTS_PER_1M` (yoksa maliyet tahmini varsayılan fiyatla yapılır).

**İsteğe bağlı kanallar:** `EMAIL_PROVIDER_KEY` + `EMAIL_FROM`, `SLACK_WEBHOOK_URL`, `TEAMS_WEBHOOK_URL`, `SLACK_SIGNING_SECRET`, `TEAMS_OUTGOING_WEBHOOK_SECRET`, `CRM_API_KEY` (+ `CRM_TENANT_PROPERTY`), `INGEST_WEBHOOK_SECRET`.

Sırlar için kurallar:

- Değerleri Vercel'de "Sensitive" olarak işaretleyin; Production ve Preview için ayrı değerler kullanın.
- Loglar `StructuredLogger` üzerinden geçer; bilinen sır değerleri ve anahtar biçimleri (`sk-…`, `xox…`, `re_…`, `pat-…`, Bearer, Slack/Teams webhook URL'leri, JWT) `[REDACTED]` olarak maskelenir. Sağlayıcı ve HTTP hataları URL veya anahtar içermez.
- `/api/ops/config` yalnızca değişken adlarını ve `ok` bayraklarını döner, değer döndürmez.

## 3. Veritabanı ve arka plan işleri

1. Supabase'de migration'ları sırayla uygulayın (`supabase db push` veya SQL Editor): `0001` … `0005_delivery_and_crm.sql`. 0005 yalnızca yeni tablo ekler (`notification_routes`, `notification_deliveries`, `crm_sync_records`), mevcut tablo ve politikaları değiştirmez.
2. Inngest Cloud → Apps → `https://<alan-adınız>/api/inngest` adresini senkronize edin. `mouseai-notification-dispatch` (her dakika) ve `mouseai-approval-sla-sweep` fonksiyonlarının listede göründüğünü doğrulayın.

## 4. Kanal bağlantıları

- **Slack giden:** Slack App → Incoming Webhooks → kanal seçin → URL'yi `SLACK_WEBHOOK_URL` olarak girin.
- **Slack gelen:** Slack App → Event Subscriptions → Request URL: `https://<alan-adınız>/api/channels/slack/events`. Slack doğrulama isteğini (`url_verification`) uç nokta otomatik yanıtlar. `message.channels` / `app_mention` olaylarına abone olun. Signing Secret → `SLACK_SIGNING_SECRET`.
- **Teams giden:** kanal → Workflows / Incoming Webhook → URL'yi `TEAMS_WEBHOOK_URL` olarak girin (Adaptive Card 1.4 gönderilir).
- **Teams gelen:** Takım → Uygulamaları yönet → Outgoing webhook oluştur → Callback URL: `https://<alan-adınız>/api/channels/teams/messages`. Teams'in verdiği güvenlik belirtecini `TEAMS_OUTGOING_WEBHOOK_SECRET` olarak girin.
- Kullanıcı eşlemesi: gelen mesajlar yalnızca `channel_identities` tablosunda eşlenmiş kullanıcılar için kaydedilir (Slack kullanıcı kimliği `U…`, Teams `aadObjectId`).
- **E-posta:** Resend'de gönderici alan adını doğrulayın (SPF/DKIM kayıtları, bkz. §5), API anahtarını `EMAIL_PROVIDER_KEY`, göndericiyi `EMAIL_FROM` olarak girin.
- **CRM:** HubSpot → Private App (scope: `crm.objects.contacts.read/write`) → token `CRM_API_KEY`. Çoklu kiracıda tek HubSpot hesabı paylaşılıyorsa, kişi özelliği olarak `mouseai_tenant_id` oluşturup `CRM_TENANT_PROPERTY=mouseai_tenant_id` girin.

## 5. Domain, DNS ve SSL

1. Vercel → Project → Settings → Domains → alan adını ekleyin (ör. `app.ornek.com` ve/veya `ornek.com`).
2. DNS sağlayıcınızda Vercel panelinin **o an gösterdiği** kayıtları girin. Tipik değerler:
   - Alt alan adı (`app.ornek.com`): `CNAME` → Vercel'in gösterdiği hedef (ör. `cname.vercel-dns.com`).
   - Kök alan adı (`ornek.com`): `A` → Vercel'in gösterdiği IP (ör. `76.76.21.21`), ya da nameserver'ları Vercel'e devredin.
   - `CAA` kaydı kullanıyorsanız `0 issue "letsencrypt.org"` ekli olmalı; yoksa sertifika çıkarılamaz.
3. SSL: Vercel, DNS doğrulandıktan sonra Let's Encrypt sertifikasını otomatik çıkarır ve yeniler; ek işlem gerekmez. Panelde "Valid Configuration" ve sertifika durumunu kontrol edin.
4. Yönlendirme: tek bir birincil alan adı seçin, diğerini (ör. `www`) 308 ile ona yönlendirin (Domains ekranındaki "Redirect to").
5. Vercel `http://` isteklerini otomatik olarak `https://`'e yönlendirir. HSTS ve diğer güvenlik başlıkları `src/middleware.ts` ile tüm rotalara eklenir (`tests/unit/security-headers.test.ts`); çıkışta `curl -I https://<alan-adınız>` ile `strict-transport-security` başlığını doğrulayın. Slack/Teams webhook'ları `Origin` başlığı göndermediği için CORS kontrolüne takılmaz.
6. Alan adı değiştiğinde: `NEXT_PUBLIC_APP_URL`, Supabase Auth → URL Configuration (Site URL, Redirect URLs), Inngest app URL'si, Slack/Teams callback URL'leri güncellenmelidir.
7. E-posta alan adı DNS'i (Resend panelinden): SPF (`TXT`), DKIM (`TXT`/`CNAME`) ve önerilen DMARC (`TXT _dmarc`) kayıtları.

## 6. Zaman aşımı sınırları

`vercel.json` `app/api/core/ask` ve `app/api/inngest` için `maxDuration: 60` tanımlar. AI çağrısı varsayılan olarak 25 sn zaman aşımı ve 1 yeniden deneme kullanır (`AI_TIMEOUT_MS`, `AI_MAX_RETRIES`); iki sağlayıcı arasında geri düşme de olduğundan, planınızın süre sınırına göre bu değerleri ayarlayın. Uzun yanıtlar için daha yüksek `maxDuration` gerekir.

## 7. Çıkış doğrulaması

Production'a çıkmadan önce hepsi geçmelidir:

1. `GET /api/ops/config` (owner/admin oturumu) → `ready: true`, kritik kontrollerin hepsi `ok: true`.
2. Vercel Runtime Logs'ta açılışta `production_config_ok` görünür, `production_config_incomplete` görünmez.
3. `POST /api/core/ask` gerçek bir soruyla → yanıtta `mock: false`, `model_calls` ve `cost_events` tablolarında gerçek token sayıları.
4. Aynı kiracıdan kısa sürede çok istek → sınır aşımında `429 rate_limited`; iki farklı instance'tan gelen isteklerin aynı sayaçta toplandığı Upstash konsolunda (`mouseai:rl:tenant:*`) görülür.
5. Test bildirim rotası ekleyin, bir bildirim üretin → `GET /api/notifications/deliveries?notificationId=…` `sent` gösterir; sessiz saatlerde `deferred`.
6. Slack/Teams'ten eşlenmiş kullanıcıyla mesaj → `channel_messages` tablosunda kayıt; yanlış imza → 401.
7. `POST /api/crm/contacts` → HubSpot'ta kişi, `crm_sync_records` eşlemesi, `audit_logs` içinde `crm.contact_synced` (e-posta adresi değil, yalnızca alan adı).
8. `https://<alan-adınız>` geçerli sertifika ile açılır, `http://` isteği `https://`'e yönlenir.
