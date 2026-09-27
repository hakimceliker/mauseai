# Production Smoke Runbook

Bu doğrulama gerçek credential değerlerini ekrana yazmaz ve varsayılan olarak
production verisini değiştirmez.

## Okuma ve hazır olma kontrolü

Approved secret store veya CI ortamında yalnızca değişkenleri tanımla:

```text
SMOKE_BASE_URL=https://<production-domain>
SMOKE_BEARER_TOKEN=<Supabase Auth test kullanıcısının runtime tokenı>
```

Ardından:

```text
npm run smoke:production
```

Beklenen sonuçlar:

- `health: 200`
- `tasks_read: 200`
- `task_write: skipped`

## Kontrollü task → Inngest → checkpoint testi

Bu test yalnızca production için ayrılmış test tenant/workflow ile ve açık
onayla çalıştırılır:

```text
SMOKE_CREATE_TASK=1
SMOKE_WORKFLOW_ID=<test workflow UUID>
npm run smoke:production
```

Test tenantı ve workflow gerçek müşteri verisi içermemelidir. Token veya secret
değeri rapora, loga, Git’e ya da sohbete yazılmaz. İşlem sonrası task ID,
dashboard/task detayından ve Inngest run ekranından kontrol edilir; hassas
değerler paylaşılmaz.

## Sonuç sınıfları

- `200`: ilgili uç nokta erişilebilir.
- `401/403`: Auth veya tenant eşlemesi tamamlanmamış; token değeri istenmez.
- `503`: deployment, veritabanı veya kritik entegrasyon hazır değil.
- `credential_not_configured`: ilgili secret store değişkeni eksik.
