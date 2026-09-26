# MouseAI — Secret Yönetimi ve Inngest Zamanlama Standardı

## 1. Secret yönetimi

### Secret sınıfları

| Secret | Kullanım | Faz |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | server-side worker/admin veri işlemleri | MVP server-only |
| `INNGEST_EVENT_KEY` | event gönderimi | MVP server-only |
| `INNGEST_SIGNING_KEY` | Inngest endpoint doğrulaması | MVP server-only |
| `OPENAI_API_KEY` | gerçek GPT | Faz 2 |
| `ANTHROPIC_API_KEY` | gerçek Claude | Faz 2 |
| `STRIPE_SECRET_KEY` | ödeme ve iade | Faz 3 |
| Connector secret’ları | Gmail, GitHub, Shopify vb. | Faz 2+ |

### Bağlayıcı kurallar

1. Secret hiçbir zaman `NEXT_PUBLIC_` değişkeni olamaz.
2. Secret kod, commit, chat, PDF, audit payload veya log içine yazılamaz.
3. Frontend yalnızca public URL ve anon/authenticated key görür.
4. Service role yalnızca server-side Route Handler, Inngest worker veya güvenilir Edge Function’da kullanılır.
5. Production secret tercihi Supabase Vault veya Doppler’dır.
6. Secret rotasyonu ve iptal prosedürü her sağlayıcı için kayıtlı olur.
7. Secret eksikse sistem sessizce fallback yapmaz; güvenli hata ve `BLOCKED` durumu üretir.

### Uygulama katmanı

`src/lib/supabase/admin.ts` service role client’ını yalnızca server-side oluşturur. Gerçek secret değerleri bu depoya yazılmaz; `.env.example` yalnızca isimleri içerir.

## 2. Inngest zamanlama standardı

| Tip | Kullanım | Kural |
|---|---|---|
| Event | task başlatma, checkpoint devamı | idempotent event ve audit |
| Delayed | bütçe tekrar kontrolü, takip | maksimum süre ve iptal yolu |
| Cron | günlük maliyet/temizlik | tenant kapsamı ve rapor kanıtı |
| Wait for event | insan onayı | timeout sonrası BLOCKED/CANCELLED |
| Step timeout | AI/tool çağrısı | 30–60 saniye başlangıç sınırı |
| Retry | geçici provider/altyapı hatası | en fazla 3, backoff ve audit |

### Zorunlu kullanım

- Uzun iş Route Handler içinde tutulmaz.
- Worker adımları checkpoint yazar.
- Retry, timeout, sleep ve approval wait audit’e yazılır.
- İnsan onayı olmadan L3/L4 iş devam etmez.
- Cron görevleri tenant verisini birbirine karıştırmaz.
- `step.sleep` ve `waitForEvent` sonrasında görev durumu tekrar doğrulanır.

## 3. Standart akışlar

```text
Task event
  → worker
  → step
  → checkpoint
  → gerekirse delayed recheck
  → gerekirse human approval wait
  → devam veya BLOCKED
```

```text
Her gece cron
  → tenant maliyet özeti
  → limit sapması
  → audit + rapor
```

## 4. Kabul kontrolleri

- [ ] Service role public bundle’da yok.
- [ ] Secret log/sentry/audit payload’a yazılmıyor.
- [ ] Eksik secret güvenli şekilde BLOCKED oluyor.
- [ ] Inngest event endpoint’i signing key ile korunuyor.
- [ ] Retry ve timeout değerleri audit’e yazılıyor.
- [ ] Human approval timeout senaryosu test ediliyor.
- [ ] Cron tenant izolasyonu ile çalışıyor.

## 5. Faz sınırı

MVP’de mock provider ve server-only secret düzeni kullanılır. Supabase Vault/Doppler’in production bağlantısı ve gerçek GPT/Claude secret’ları Faz 2’de, Stripe secret’ı Faz 3’te açılır.
