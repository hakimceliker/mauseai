# PLAN-006/007 — Provider ve Maliyet Kabul Runbook'u

**Sahip:** Codex + ürün sahibi + finans  
**Bağımlılık:** PLAN-004 ve PLAN-005  
**Durum:** Adapter, güvenli hata ve maliyet kodu hazır; canlı provider/ledger kanıtı bekliyor.

## 1. Provider kabulü

Her provider ayrı ve açıkça seçilerek test edilir:

| Provider | Değişken | PASS |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | Redacted gerçek completion, provider adı, token ve maliyet döner |
| Anthropic | `ANTHROPIC_API_KEY` | Redacted gerçek completion, provider adı, token ve maliyet döner |

Kurallar:

- Secret değerleri gösterilmez veya kanıta yazılmaz.
- Secret yoksa `credential_not_configured` döner.
- Mock provider production kabulü değildir.
- Provider HTTP hatası güvenli, redacted hata olarak raporlanır.
- Timeout/network hatası bounded retry ile sınırlıdır.
- Provider seçimi `AI_PROVIDER` ile açıkça yapılır.
- Gerçek çağrı yalnız onaylı test tenant'ında yapılır.

## 2. Provider testleri

1. OpenAI seçilir ve tek kısa test prompt'u gönderilir.
2. Anthropic seçilir ve tek kısa test prompt'u gönderilir.
3. Yanıt boş/uygunsuzsa task başarıya geçirilmez.
4. Token kullanımı ve hesaplanan maliyet kaydedilir.
5. Sağlayıcı hatası kontrollü biçimde `FAILED` olur.
6. Aynı task tekrarlandığında duplicate completion veya duplicate maliyet oluşmaz.
7. Loglarda prompt, secret ve PII redaction doğrulanır.

## 3. PLAN-007 maliyet uzlaştırması

Her test için şu eşleşme kanıtlanır:

```text
provider usage
  = step cost
  = task cost_actual
  = audit/cost ledger total
```

Fark varsa kabul `FAIL` olur. Maliyet bilinmiyorsa sıfır yazılmaz; durum `NOT_RUN` veya `UNKNOWN` olur.

## 4. Güvenli çalıştırma

```powershell
$env:AI_PROVIDER="openai"
$env:OPENAI_API_KEY="<approved-secret-source>"
npm run acceptance:production
```

Anthropic için yalnız provider adı ve onaylı secret kaynağı değiştirilir. Değerlerin kendisi terminale, sohbete veya dosyaya yazılmaz.

## 5. Kabul kararları

- İki provider testi ve maliyet eşleşmesi PASS: PLAN-006/007 `PASS`.
- Eksik key: `credential_not_configured`.
- Mock-only çalışma: production acceptance değil.
- Token/maliyet/audit eşleşmiyorsa: `FAIL`.
- Gerçek provider çağrısı çalıştırılmadıysa: `NOT_RUN`.

## 6. Rollback

Provider hatası veya beklenmeyen maliyet görülürse:

1. `AI_PROVIDER=mock` yalnız local/test ortamına alınır; production işi durdurulur.
2. İlgili provider anahtarı revoke/rotate edilir.
3. Etkilenen task `FAILED`/`BLOCKED` bırakılır.
4. Ledger ve audit kayıtları korunur.
5. Düzeltme branch/PR üzerinden yapılır.
