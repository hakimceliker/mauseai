# PLAN-005 — Inngest Production Workflow Kabul Runbook'u

**Sahip:** Codex + Inngest  
**Bağımlılık:** PLAN-004 PASS  
**Kanonik event:** `task.execute`  
**Durum:** Kod ve kabul yöntemi hazır; production run kanıtı bekliyor.

## 1. Kapsam

Bu runbook şu zinciri doğrular:

```text
authenticated task create
  → task.execute event
  → Inngest execute-task function
  → ordered workflow steps
  → idempotency check
  → AI step
  → checkpoint
  → cost/audit
  → completed/failed terminal state
```

`task/run` bu uygulamanın kanonik production event adı değildir. Uygulama kodundaki event `task.execute` olarak kabul edilir; doküman veya testlerde başka ad kullanılamaz.

## 2. Ön koşullar

- PLAN-004 Auth ve tenant izolasyonu PASS.
- Inngest production app senkronize.
- Production `/api/inngest` endpoint'i Inngest tarafından erişilebilir.
- `INNGEST_EVENT_KEY` ve `INNGEST_SIGNING_KEY` onaylı secret kaynağında mevcut.
- Onaylı test workflow'ı ve test tenant'ı mevcut.
- Gerçek müşteri verisi ve gerçek ödeme kullanılmıyor.

Secret değerleri loga veya kanıta yazılmaz. Eksik secret `credential_not_configured` olarak kalır.

## 3. Kabul kontrolleri

| Kod | Kontrol | PASS ölçütü |
|---|---|---|
| INNGEST-01 | App sync | Production uygulaması güncel function konfigürasyonunu gösterir |
| INNGEST-02 | Trigger | Authenticated task creation sonrası `task.execute` event'i alınır |
| INNGEST-03 | Worker | `execute-task` run'ı terminal duruma ulaşır |
| INNGEST-04 | Step sırası | Workflow step'leri order değerine göre tamamlanır |
| INNGEST-05 | Checkpoint | Her step sonrası tekil checkpoint oluşur |
| INNGEST-06 | Audit | Step/task başarı veya hata audit kaydı oluşturur |
| INNGEST-07 | Cost | Task cost kaydı audit/ledger ile eşleşir |
| INNGEST-08 | Retry | Geçici hata bounded retry ile yeniden denenir |
| INNGEST-09 | Idempotency | Aynı task/step duplicate event'te ikinci yan etki üretmez |
| INNGEST-10 | Failure | Kalıcı hata `FAILED` olur; sahte `COMPLETED` olmaz |
| INNGEST-11 | Tenant | Worker yalnız event tenant'ına ait task/step verisini işler |

## 4. Çalıştırma ve kanıt

Üretimde yalnız kabul runner'ı ve Inngest dashboard run referansı kullanılır. Event payload, token veya response body kanıta kopyalanmaz.

```powershell
$env:SMOKE_BASE_URL="https://mauseai.vercel.app"
$env:SMOKE_USER_A_TOKEN="<secret-source>"
$env:SMOKE_WORKFLOW_ID="<approved-workflow-id>"
$env:SMOKE_EVIDENCE_FILE="tmp/plan-005-acceptance.json"
npm run acceptance:production
```

Evidence kaydı şunları içerebilir:

- task/run referansı
- function/run durum etiketi
- terminal task state
- checkpoint sayısı ve sürümü
- audit/cost kayıtlarının redacted eşleşmesi
- duplicate test sonucu
- hata sınıfı ve rollback sonucu

## 5. Retry ve idempotency kuralı

Bir step'in kimliği deterministik olmalıdır:

```text
step-{taskId}:{stepId}:{attempt}
```

DB unique constraint ve Inngest step memoization birlikte korunur. Aynı `taskId + stepId + version` tekrarında ikinci checkpoint veya yan etki yazılmaz. Retry sayısı bounded kalır; sınırsız döngü kabul edilmez.

## 6. Kabul ve rollback

- Tüm `INNGEST-*` kontrolleri PASS: PLAN-005 PASS.
- Event alınmadı veya run gözlenemedi: `NOT_RUN`/`BLOCKED`.
- Secret yok: `credential_not_configured`.
- Duplicate yan etki, tenant karışması veya checkpoint çakışması: kritik FAIL.

FAIL durumunda:

1. Production trigger durdurulur.
2. Etkilenen task `FAILED` veya `BLOCKED` olarak bırakılır.
3. İlgili Inngest function deploy'u geri alınır.
4. Audit ve run referansı redacted olarak korunur.
5. Düzeltme branch/PR üzerinden yapılır.
6. Yeni run ve duplicate testleri geçmeden acceptance verilmez.
