# ST3.6 P0 Uygulama ve Kabul Paketi

**Repo:** `hakimceliker/mauseai`  
**Kapsam:** PLAN-001–PLAN-007  
**Durum:** Yürütme başlatıldı; production kabulü verilmedi.  
**Kural:** Kanıt yoksa sonuç `NOT_RUN`, `BLOCKED` veya `credential_not_configured` olarak kalır.

## 1. Amaç

Bu paket, ST3.6 kanunundaki kritik production yolunu tek bir sıraya bağlar:

```text
proje kararı
  → test erişimi
  → Auth/RLS
  → tenant izolasyonu
  → Inngest workflow
  → checkpoint/audit/cost
  → provider doğrulaması
  → acceptance kararı
```

P0 tamamlanmadan gerçek müşteri verisi, canlı ödeme veya geniş connector kapsamı açılmaz.

## 2. Görevler ve teslimler

| Task | Sahip | Teslim | Kabul kanıtı | Durum |
|---|---|---|---|---|
| PLAN-001 | Ürün sahibi | Proje kartı, bütçe, sorumlu, hedef tarih | Onaylı kart ve karar kaydı | Kullanıcı girdisi bekliyor |
| PLAN-002 | Ürün/satış | Hedef müşteri ve mevcut süreç baz ölçümü | Görüşme/ölçüm kaydı | Kullanıcı girdisi bekliyor |
| PLAN-003 | Codex | Branch, commit, PR, CI, ortam envanteri | GitHub linki ve CI kanıtı | Başlatıldı |
| PLAN-004 | Codex + Supabase | Auth, iki tenant, çapraz tenant negatif test | Redacted acceptance JSON | Credential/test hesabı bekliyor |
| PLAN-005 | Codex + Inngest | Trigger, worker, checkpoint, retry, duplicate event | Run ID + DB kanıtı | Production sync/test workflow bekliyor |
| PLAN-006 | Codex + kullanıcı | OpenAI/Anthropic gerçek çağrı ve maliyet | Secret göstermeyen provider raporu | Credential bekliyor |
| PLAN-007 | Codex + finans | Task maliyeti ile ledger uzlaştırması | Task/audit/cost eşleşme raporu | PLAN-005/006 bağımlı |

## 3. Tek çalıştırma komutu

Credential değerleri komut satırına veya loga yazılmaz. Yetkili runtime ortamında yalnız değişken adları kullanılır:

```powershell
$env:SMOKE_BASE_URL="https://mauseai.vercel.app"
$env:SMOKE_USER_A_TOKEN="<runtime secret source>"
$env:SMOKE_USER_B_TOKEN="<runtime secret source>"
$env:SMOKE_WORKFLOW_ID="<approved workflow id>"
$env:SMOKE_EVIDENCE_FILE="tmp/production-acceptance.json"
npm run acceptance:production
```

Eksik değerlerde runner güvenli biçimde durur ve `credential_not_configured` raporlar. Secret değeri hiçbir çıktı veya kanıt dosyasına yazılmaz.

## 4. Kabul tablosu

| Kontrol | PASS koşulu | FAIL/BLOCKED koşulu |
|---|---|---|
| Auth | Test kullanıcısı giriş yapar | Token yok, 401 dışı davranış veya credential eksik |
| Tenant A/B | Her kullanıcı tek tenant görür; tenantlar farklıdır | Karışık tenant verisi veya test hesabı yok |
| Çapraz erişim | Diğer tenant task’ı 403/404 döner | 200 veya veri sızıntısı |
| Workflow | `task.execute`/task oluşturma ve worker terminal durumu gözlenir | Trigger, worker veya sync yok |
| Checkpoint | Task yanıtında/timeline’da checkpoint görünür | Kayıt yok veya gözlenemiyor |
| Audit/cost | Task, audit ve maliyet kayıtları eşleşir | Canlı kayıt yok veya uzlaştırma yapılamıyor |
| Retry/idempotency | Aynı olay ikinci yan etki üretmez | Duplicate kayıt/yan etki oluşur |
| Provider | Gerçek çağrı redacted kanıtla başarılı veya kontrollü hata verir | Credential eksik veya sahte PASS |

Acceptance kararı yalnızca bütün satırlar PASS olduğunda `ACCEPT` olabilir.

## 5. Kanıt dosyası standardı

Kanıt dosyası secret, token, PII veya tam response body içermez. Her kayıt şu alanları taşır:

```json
{
  "task": "PLAN-004",
  "environment": "production",
  "status": "PASS | FAIL | NOT_RUN | BLOCKED | credential_not_configured",
  "checkedAt": "ISO-8601",
  "checks": [{
    "name": "cross_tenant_task_rejected",
    "status": "PASS",
    "httpStatus": 403
  }],
  "evidence": ["redacted-run-reference"],
  "secretValuesIncluded": false
}
```

## 6. Branch/PR/CI protokolü

1. `main` doğrudan değiştirilmez.
2. Her PLAN ayrı branch ve PR ile yürür.
3. Lint, typecheck, test, build, audit, secret-scan, Docker ve CodeQL yeşil olmadan merge yapılmaz.
4. PR açıklamasında değişen dosyalar, test sayısı, kalan engel ve rollback yazılır.
5. Merge sonrası main CI ve production health/readiness tekrar doğrulanır.

## 7. Şu anki gerçek karar

- Kod/CI/health: teknik olarak geçerli.
- ST3.6 envanteri: 377 kontrol repo’da mevcut.
- Runtime doğrulama: henüz yapılmadı.
- Auth/tenant/Inngest/provider/cost kabulü: `NOT_RUN` veya `credential_not_configured`.
- Production kabulü: **REJECT / beklemede**.

Bu durum, eksik credential’ı saklamadan ve sahte başarı üretmeden ilerlemeyi sağlar.
