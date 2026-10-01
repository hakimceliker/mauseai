# Senatech AI Kullanım ve Depo Yönetim Standardı — MauseAI

**Kapsam:** Yalnızca `hakimceliker/mauseai` deposu ve MauseAI çalışma kopyası.
**Durum:** Uygulama sözleşmesi.
**Üretim ilkesi:** Local-first, cloud-fallback; local AI üretimin zorunlu bağımlılığı değildir.

## 1. AI çağrı sözleşmesi

```text
AI çağrısı → local erişim kontrolü → private Ollama/gateway
                         └─ başarısız → mevcut cloud provider
```

MauseAI router local gateway’i önce dener. Endpoint erişilemiyor, timeout oluyor,
hata dönüyor, geçersiz yanıt veriyor veya credential eksikse mevcut OpenAI/
Anthropic/mock provider’a geçer. Fallback kullanıcıya laptop veya tunnel hatası
olarak gösterilmez.

## 2. Yapılandırma

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=https://private-tunnel-or-gateway-url
LOCAL_AI_MODEL=qwen3:8b
LOCAL_AI_CONNECT_TIMEOUT_MS=3000
LOCAL_AI_INFERENCE_TIMEOUT_MS=45000
```

`localhost:11434` yalnızca aynı makinedeki geliştirme içindir. Production’da
Ollama portu doğrudan internete açılmaz; private network veya güvenli gateway
kullanılır. Gerçek değerler `.env.local`, Vercel Environment Variables veya
onaylı secret manager’da tutulur; bu dosyaya yazılmaz.

## 3. Güvenlik ve veri sınırı

- Cloud credential’ları silinmez, değiştirilmez ve loglanmaz.
- Provider adapter’ları server-side çalışır; frontend’e secret aktarılmaz.
- Prompt, kişisel veri, API key, token ve ham provider yanıtı loglanmaz.
- Eksik credential sonucu `credential_not_configured` olur; sahte başarı üretilmez.
- Gerçek müşteri verisi, canlı ödeme veya geri döndürülemez işlem bu sözleşmenin
  testlerinde kullanılmaz.
- Bu değişiklik MauseAI dışındaki projelere, depolara veya branch’lere uygulanmaz.

## 4. Redakte telemetry

Her çağrı için yalnızca aşağıdaki alanlar kaydedilebilir:

- rota: `LOCAL` veya `CLOUD`
- provider/model
- fallback ve redakte fallback nedeni
- latency
- token sayısı
- tahmini maliyet ve mümkünse önlenen maliyet

## 5. Faz ve kabul eşlemesi

| Faz | Kapsam | Güncel durum | Kapanış kanıtı |
|---|---|---|---|
| F0 | Kanun, repo ve tek kayıt | COMPLETE | Kanonik governance ve envanter |
| F1 | Kod iskeleti ve kalite kapıları | COMPLETE | Main CI, CodeQL, test/build |
| F2 | Auth, RLS ve tenant izolasyonu | LIVE_TEST_PENDING | A/B giriş ve çapraz tenant reddi |
| F3 | Task/conversation/approval API | CODE_COMPLETE_LIVE_TEST_PENDING | API entegrasyon matrisi |
| F4 | Inngest workflow/checkpoint/retry | LIVE_TEST_PENDING | Gerçek `task.execute` run kanıtı |
| F5 | OpenAI/Anthropic ve local-first router | PR #88 READY_FOR_MERGE | PR CI + local/fallback testleri; canlı gateway kanıtı ayrıca |
| F6 | Audit, cost ve idempotency | PARTIAL | Retry sonrası tek ledger/yan etki kanıtı |
| F7 | Stripe sandbox, storage, analytics | PARTIAL | Her connector için redakte test kanıtı |
| F8 | Beyaz/şeffaf UI | IN_PROGRESS | Görsel, responsive ve erişilebilirlik kabulü |
| F9 | Security/observability/release | PARTIAL | Sentry/Langfuse, threat model, rollback |
| F10 | KPI, finans ve birim ekonomi | DATA_PENDING | Baseline, hedef, sahip ve ölçüm kaydı |
| F11 | Pilot, runner ve devralma | NOT_STARTED | İki redakte pilot sonucu |
| F12 | Hukuk, operasyon ve final kabul | BLOCKED_BY_F0_F11 | G0–G12 kanıt tablosu ve ACCEPT/REJECT |

## 6. Değişiklik teslim zinciri

Her değişiklik şu sırayı izler:

```text
repo/branch doğrula → branch aç → kod/doküman → test
→ security review → PR → CI → commit/evidence → merge onayı
→ main doğrulama → production smoke → status güncelle
```

Main’e doğrudan push, kullanıcı onayı olmadan merge veya production deploy
yapılmaz. Test veya kanıt yoksa görev `PARTIAL`, `BLOCKED`, `NOT_RUN` ya da
`credential_not_configured` olarak kalır.

## 7. Bu standardın MauseAI uygulama kanıtı

- Kod: `src/lib/ai/ai-router.ts`
- Local adapter: `src/lib/ai/providers/local-ollama.ts`
- Test: `src/__tests__/local-ai-fallback.test.ts`
- Yapılandırma şablonu: `.env.example`
- Uygulama rehberi: `docs/integrations/local-ai-fallback.md`
- PR: https://github.com/hakimceliker/mauseai/pull/88

## 8. Açık engeller

1. PR #88 için kullanıcı merge onayı.
2. Approved private local gateway ile gerçek local başarı testi.
3. Runtime OpenAI/Anthropic credential ile redakte canlı provider testi.
4. Faz 2 Auth/RLS ve Faz 4 Inngest canlı kabul kanıtları.

Bu engeller çözülmeden MauseAI `PRODUCTION-READY` olarak raporlanmaz.
