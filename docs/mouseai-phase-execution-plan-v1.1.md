# MouseAI — Fazlı Uygulama ve Kabul Planı v1.1

**Repository:** `hakimceliker/mauseai`  
**Kanonik klasör:** `C:\Users\Administrator\Documents\Codex\2026-09-26\ya\mouseai-core`  
**Kural:** Main’e doğrudan push yok; her değişiklik branch → PR → CI → evidence → merge sırasındadır.  
**Kabul ilkesi:** Doküman veya kod hazır olması, canlı üretim kabulü anlamına gelmez.

## Faz 0 — Kanonik proje kaydı

### Yapılacaklar

- `PROJECT_STATUS.md` ve `ACCEPTANCE_REPORT.md` güncel tutulur.
- `docs/evidence/` kanıt dizini oluşturulur.
- G0–G12 kapı tablosu tutulur.
- Faz/issue/branch/PR matrisi tutulur.
- Tek repository ve çalışma klasörü doğrulanır.
- Sahiplik ve yetki matrisi hazırlanır.
- Risk kaydı ve başlangıç kararı oluşturulur.

### Çıktı ve kapanış

- Proje durumu tek kanonik kayıtta görünür.
- Eski/yeni roadmap çelişkileri işaretlenir.
- Her kayıt `DONE`, `VERIFIED`, `PARTIAL` veya `BLOCKED` durumundadır.
- Ürün sahibi, sponsor, maliyet merkezi ve risk sahibi onaylanmadan G0 geçmez.

## Faz 1 — G0–G4 iş ve fizibilite

### Yapılacaklar

- Proje kartı, problem ve müşteri hipotezleri hazırlanır.
- İş, ürün, teknik, operasyon ve risk/yönetişim modelleri doldurulur.
- MVP ve pilot kapsamı belirlenir.
- Başarı, red ve durdurma kriterleri yazılır.
- 13 haftalık nakit akışı hazırlanır.
- Geliştirme, sağlayıcı, kullanıcı ve pilot maliyeti hesaplanır.
- Düşük/temel/yüksek senaryo oluşturulur.
- Bütçe ve kapasite sınırları atanır.

### Kapanış kanıtı

Onaylı proje kartı, beş model, pilot charter, finans tablosu ve G0–G4 karar kaydı.
Gerçek veri yoksa değer `ASSUMPTION` olarak kalır; kabul kanıtı sayılmaz.

## Faz 2 — Mimari ve teknik sözleşme

### Yapılacaklar

- Sistem mimarisi ve veri akışı yazılır.
- API, veri, Auth, tenant ve storage sözleşmeleri oluşturulur.
- Inngest workflow, checkpoint, audit, retry ve idempotency sözleşmeleri yazılır.
- Hata kodları, timeout, rollback ve recovery davranışları belirlenir.
- Threat model ve secret kullanım politikası güncellenir.
- Her sözleşme için başarılı ve başarısız test senaryosu eklenir.

### Kapanış kanıtı

Mimari doküman, sözleşme matrisi, threat model, test planı ve rollback planı.

## Faz 3 — Auth, Supabase ve tenant izolasyonu

### Yapılacaklar

- Supabase Auth middleware ve JWT doğrulaması uygulanır.
- Profile → tenant eşleşmesi doğrulanır.
- RLS migration’ları ve storage sınırları tamamlanır.
- Authenticated/anonymous API davranışları test edilir.
- Tenant A/B güvenli test fixture’ları hazırlanır.
- Logout ve expired-token davranışı test edilir.

### Kapanış kanıtı

- Kullanıcı A ve B ile giriş
- İki tenant oluşturma
- Tenant dışı erişimin `403/404` veya RLS reddi
- Logout ve token süresi testi
- Redacted evidence dosyası

Gerçek token yoksa sonuç `credential_not_configured` olur; PASS yazılmaz.

## Faz 4 — Inngest durable workflow

### Yapılacaklar

- Production sync kontrol edilir.
- `task/run` acceptance runner çalıştırılır.
- Worker, checkpoint ve audit gözlemlenir.
- Retry, timeout ve idempotency test edilir.
- `FAILED`, `BLOCKED` ve UNKNOWN uzlaştırma davranışı doğrulanır.
- Rollback/recovery ve offline runner senaryoları test edilir.

### Kapanış kanıtı

Trigger ID, worker sonucu, checkpoint/audit kayıtları, retry/idempotency sonucu ve rollback kanıtı.

## Faz 5 — AI provider sistemi

### Yapılacaklar

- OpenAI ve Anthropic adapter’ları doğrulanır.
- Local-first/cloud-fallback router çalıştırılır.
- Local açık, kapalı, timeout ve geri dönüş senaryoları test edilir.
- Provider hata, timeout ve retry davranışı doğrulanır.
- Token, maliyet ve tenant bütçesi kaydedilir.
- Mock adapter ve `credential_not_configured` akışı korunur.
- Prompt, kişisel veri ve secret redaction uygulanır.

### Kapanış kanıtı

Redacted provider çağrısı, latency/token/maliyet kaydı ve fallback matrisi.
API anahtarları hiçbir kanıta yazılmaz.

## Faz 6 — Ödeme ve entegrasyonlar

### Yapılacaklar

- Stripe sandbox ve webhook imza doğrulaması.
- Idempotent ödeme işleme ve wallet/ledger audit.
- Supabase, Vercel ve Inngest bağlantı kanıtları.
- OpenAI/Anthropic runtime kanıtları.
- Sentry/Langfuse/PostHog event ve trace kanıtları.

### Kapanış kanıtı

Her entegrasyon için bağlantı, test sonucu, ortam, tarih, redacted çıktı ve rollback notu.
Gerçek ödeme yapılmaz.

## Faz 7 — UI, runner ve verifier

### Yapılacaklar

- Beyaz/şeffaf MouseAI tasarım sistemi.
- Dashboard, task inbox, agent görünümü ve canlı aktivite.
- Approval-first, görev devri ve checkpoint ekranları.
- Hata, retry ve verifier sonucu.
- Verifier olmadan `SUCCEEDED` verilmesini engelleme.
- Responsive ve erişilebilirlik kontrolleri.
- Runner bağlantısı, iptal, offline, reconnect ve yanlış pencere/hesap koruması.

### Kapanış kanıtı

UI testleri, responsive ekran kanıtı, accessibility sonucu ve runner/reconnect kanıtı.

## Faz 8 — Test ve kalite kapıları

Her PR’da:

```text
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npm run verify
npm audit --audit-level=high
secret scan
CodeQL
Docker build
```

Her faz ayrıca branch, PR, commit hash, CI kanıtı, rollback açıklaması ve güncel status kaydı üretir.

## Faz 9 — Gerçek pilot

### Yapılacaklar

- İki pilot senaryosu seçilir.
- Pilot öncesi baseline kaydedilir.
- Pilot sonrası başarı, hata, süre ve maliyet ölçülür.
- Kullanıcı faydası ve kabul/red kararı yazılır.
- KPI sahibi, sorgusu, ölçüm sıklığı ve alarm eşiği atanır.

Gerçek kullanıcı/pilot kanıtı olmadan G10 kapanmaz.

## Faz 10 — Yayın ve işletme

### Yapılacaklar

- Release checklist ve production runbook.
- Incident response, backup/restore ve rollback provası.
- Destek sorumlusu ve alarm devri.
- Hukuk, gizlilik, lisans, domain ve marka kontrolleri.
- Satış veya yetkili iç kullanım kararı.
- Finansal mutabakat.

### Kapanış kanıtı

Yayın kararı, runbook, restore/rollback kaydı, destek devri ve hukuk/işletme kayıtları.

## Faz 11 — G12 nihai kabul

Şu dört grup birlikte PASS olmadan G12 kapanmaz:

1. Auth ve tenant isolation
2. Inngest workflow
3. Provider, observability ve rollback
4. Pilot, finans ve işletme kanıtı

Sonrasında G0–G12 kayıtları, `ACCEPTANCE_REPORT.md`, issue/PR envanteri ve final rapor güncellenir.
Ancak bundan sonra `PRODUCTION-READY` denebilir.

## Uygulama döngüsü

```text
Repo doğrula
→ Güncel main al
→ Branch aç
→ Kod/doküman/test yaz
→ CI çalıştır
→ PR aç
→ Review bulgularını düzelt
→ CI yeşilse merge için hazırla
→ Main CI doğrula
→ Evidence yaz
→ PROJECT_STATUS güncelle
→ Sonraki faza geç
```

## Dış bağımlılıklar

Codex’in doğrudan hazırlayabileceği işler: kod, migration, test, CI, dokümantasyon,
runner, evidence, branch ve PR hazırlığıdır.

Kullanıcı/harici kanıt gerektiren işler: gerçek secret erişimi, test kullanıcıları,
müşteri pilotu, finansal karar, hukuki onay ve nihai işletme kabulüdür.

