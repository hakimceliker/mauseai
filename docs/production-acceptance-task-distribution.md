# MouseAI Production Kabulü — Görev Dağılımı ve Eksik Takip Planı

## Amaç

Bu belge, kod/CI/health doğrulaması ile gerçek production kabulünü birbirinden ayırır. Kanıtlanmayan hiçbir madde tamamlandı sayılmaz.

## Güncel temel durum

| Alan | Durum | Kanıt |
|---|---|---|
| PR #76 ve PR #77 | Tamamlandı | GitHub merge kayıtları |
| Main CI | Tamamlandı | quality, CodeQL, secret scan, Docker, dependency audit |
| Production health | Tamamlandı | `/api/health` healthy, database ready |
| Production readiness | Tamamlandı | `/api/health/ready` `ready: true` |
| Kod doğrulaması | Tamamlandı | lint, typecheck, 266 test, build |
| Gerçek Auth testi | Bekliyor | Test hesabı gerekli |
| Tenant izolasyonu testi | Bekliyor | İki test tenant’ı gerekli |
| Inngest canlı workflow | Bekliyor | Production trigger ve test workflow gerekli |

## Görev sahipliği

### GPT/Codex — uygulama ve kanıt

- Auth/tenant smoke testlerini çalıştırır.
- Inngest `task.execute` akışını tetikler ve kanıt toplar.
- Worker, checkpoint, audit, retry ve idempotency sonuçlarını raporlar.
- Test, migration, API ve teknik doküman değişikliklerini yapar.
- Her teslimi branch → commit → PR → CI kanıtı olarak verir.

### Claude — bağımsız denetim

- PR diff ve mimari sözleşmeyi inceler.
- Auth, RLS, tenant izolasyonu ve secret akışını denetler.
- Retry/idempotency ve hata durumlarını kontrol eder.
- Sonucu yalnızca `APPROVE`, `CHANGES_REQUESTED` veya `BLOCKED` olarak verir.

### Kullanıcı — dış sistem ve insan kapısı

- Test hesabı ve iki boş test tenant’ı sağlar.
- Supabase, Vercel ve Inngest panellerindeki hesap/onay adımlarını tamamlar.
- Secret değerlerini yalnızca onaylı secret store’a girer.
- Gerçek ödeme, müşteri mesajı ve production veri kararlarını verir.

### Supabase

- Auth, database, migration ve RLS altyapısını sağlar.
- Test tenant’larını ve üyeliklerini barındırır.
- Tenant A/B negatif erişim kanıtlarını sağlar.

### Vercel

- Main production deployment’ını çalıştırır.
- Production environment değişkenlerini yönetir.
- Health, readiness, rollback ve deployment kanıtını sağlar.

### Inngest

- `task.execute` event’ini alır.
- Worker retry, checkpoint, audit ve idempotency yürütmesini sağlar.
- Production run ve hata kanıtını sağlar.

## Bağımlılık sırası

1. Kullanıcı test hesabını ve iki boş test tenant’ını hazırlar.
2. Supabase Auth/RLS erişimi doğrulanır.
3. Vercel production deployment ve environment durumu doğrulanır.
4. Inngest production uygulaması senkronize edilir.
5. GPT/Codex Auth ve tenant negatif testlerini çalıştırır.
6. GPT/Codex `task.execute` workflow’unu çalıştırır.
7. Checkpoint, audit, retry ve idempotency kanıtları toplanır.
8. Claude bağımsız review yapar.
9. Final acceptance raporu yazılır.

## Zorunlu kabul testleri

### Auth ve tenant

- [ ] Test kullanıcısı giriş yapıyor.
- [ ] Logout çalışıyor.
- [ ] Token süresi dolduğunda erişim reddediliyor.
- [ ] İki tenant oluşturuldu.
- [ ] Kullanıcı yalnızca kendi tenant verisini görüyor.
- [ ] Diğer tenant’a SELECT/INSERT/UPDATE/DELETE reddediliyor.

### Inngest workflow

- [ ] Production uygulaması senkronize.
- [ ] `task.execute` trigger’ı gönderildi.
- [ ] Worker çalıştı.
- [ ] Checkpoint oluştu.
- [ ] Audit kaydı oluştu.
- [ ] Retry davranışı kanıtlandı.
- [ ] Aynı iş ikinci kez yan etki üretmedi.
- [ ] Hata senaryosu `FAILED` veya `BLOCKED` oldu.

### Log ve güvenlik

- [ ] Secret/token loglanmadı.
- [ ] Gerçek müşteri verisi kullanılmadı.
- [ ] Production loglarında kritik hata yok.
- [ ] CodeQL, secret scan, audit ve Docker yeşil.

## Credential kuralı

Credential yoksa:

- Değer istenmez veya sohbete yazılmaz.
- İşlem `credential_not_configured` olarak durur.
- Test PASS olarak işaretlenmez.
- Eksik değişken adı raporda yazılabilir; değer asla yazılmaz.

## Şu anki eksikler

### Production kabulünü engelleyenler

1. Gerçek Auth test hesabı/tokenı.
2. İki boş test tenant’ı ve üyelikleri.
3. Inngest production trigger/run kanıtı.
4. Worker/checkpoint/audit canlı kanıtı.
5. Retry/idempotency canlı kanıtı.

### Sonraki aşama işleri

1. OpenAI ve Anthropic gerçek provider doğrulaması.
2. Sentry/Langfuse/PostHog gerçek event doğrulaması.
3. Gerçek e-posta/Slack sağlayıcısı.
4. Stripe sandbox ve daha sonra canlı ödeme kapısı.
5. Realtime socket doğrulaması.
6. Husky deprecated uyarısının temizlenmesi.
7. Eski alternatif worker kodunun kaldırılması veya deprecated olarak işaretlenmesi.

## Nihai karar kuralı

Auth, tenant isolation, Inngest workflow ve production logs/audit gruplarının tamamı kanıtlanmadan MouseAI production kabulü tamamlandı sayılmaz.

Kabul kararı yalnızca şu formatta verilebilir:

```text
Auth: PASS/FAIL
Tenant isolation: PASS/FAIL
Inngest workflow: PASS/FAIL
Production logs/audit: PASS/FAIL
Final decision: ACCEPT/REJECT
```
