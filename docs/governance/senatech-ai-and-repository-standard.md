# Senatech AI Kullanım ve Depo Yönetim Standardı — MauseAI

**Kapsam:** Yalnızca `hakimceliker/mauseai` deposu ve MauseAI çalışma kopyası.
**Durum:** Uygulama sözleşmesi.
**Üretim ilkesi:** Local-first, cloud-fallback; local AI üretimin zorunlu bağımlılığı değildir.

## 0. Kanonik altyapı ve çalışma katmanları

MAUSEAI aşağıdaki zincir üzerinde işletilir. Katmanlar birbirinin yerine geçmez;
her katmanın rolü, yazma yetkisi ve kanıt sorumluluğu ayrıdır.

```text
GitHub — Source of Truth
  ↓ pull/read synchronization
GitLab — Secondary CI / private pipeline / mirror-backup
  ↓ read-only pull mirror / controlled CI input
Forgejo — local/private mirror + DR + local CI
  ↓ local checkout
Windows/Docker — local runtime and reproducible development environment
  ↓ local-first inference
Ollama/Qwen — preferred local AI path
  ↓ controlled fallback / scale path
NVIDIA NIM / OpenAI / Claude / Cloudflare
  ↓ health, cost and failure control
Doctor / Observability / Watchdog / Recovery
  ↓ independent acceptance
Judge / Evidence / Audit / Human Approval
```

### 0.1 Kaynak doğruluğu

- GitHub, branch, commit, PR, issue, CI sonucu ve kabul zincirinin tek kanonik
  kaynağıdır.
- GitLab ikincil CI, private pipeline veya mirror-backup rolündedir; GitHub
  commit/SHA yerine geçmez.
- Forgejo yalnızca yerel/private mirror, disaster recovery ve yerel CI katmanıdır.
  Forgejo kaynak geliştirme deposu değildir.
- GitLab veya Forgejo üzerinde üretilen her sonuç GitHub branch/commit/SHA ile
  ilişkilendirilmeden kabul kanıtı sayılamaz.
- Aynalama hiçbir katmanda otomatik source mutation, force-push, branch silme veya
  GitHub’a geri yazma yapamaz.

### 0.2 Yetki sınırı

| Katman | İzinli rol | Yasak/insan onaylı işlem |
|---|---|---|
| GitHub | Kaynak branch/PR/CI/evidence | Kritik merge, branch silme, protection değişikliği |
| GitLab | İkincil CI/private pipeline | GitHub kaynağını değiştirme |
| Forgejo | Salt-okunur mirror/DR/local CI | Source push, force-push, silme |
| Windows/Docker | Local build/test/runtime | Production secret veya canlı veri değişikliği |
| Ollama/Qwen | Local-first inference | Production için zorunlu bağımlılık |
| NVIDIA/OpenAI/Claude/Cloudflare | Fallback/scale | Secret’i client/log içine yazma |
| Doctor/Watchdog/Recovery | Hata sınıflandırma ve güvenli toparlama | Kanıtsız PASS/CLOSED |
| Judge/Evidence/Audit | Bağımsız doğrulama ve iz | İşi yapan ajanın kendi nihai PASS’ı |
| Human Approval | Kritik ve geri dönüşü zor karar | Onaysız production/DNS/payment/merge |

### 0.3 Durum ve kanıt kuralı

GitLab, Forgejo, local runner veya Docker sonucu yalnızca yardımcı kanıt olarak
kaydedilir. Nihai kayıt her zaman kanonik GitHub SHA’sına bağlanır. GitHub ve
yardımcı katmanlar arasında SHA, workflow veya evidence uyuşmazlığı varsa durum
`REVIEW`, `STALE` veya `BLOCKED` kalır; otomatik olarak `PASS` yapılmaz.

GitHub erişilemiyorsa GitLab/Forgejo/local CI teknik ilerlemeyi sürdürebilir,
ancak bu sonuçlar GitHub’a bağlanıp yeniden doğrulanana kadar production kabulü,
merge kabulü veya `CLOSED` statüsü üretemez.

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
GitHub remote/branch doğrula → GitHub branch aç → kod/doküman → local test
→ GitLab secondary CI (varsa) → Forgejo mirror/local CI (varsa)
→ security review → GitHub PR → GitHub CI → commit/evidence SHA uzlaştırması
→ bağımsız review/Judge → insan merge onayı → main doğrulama
→ production smoke → status güncelle
```

Main’e doğrudan push, kullanıcı onayı olmadan merge veya production deploy
yapılmaz. Test veya kanıt yoksa görev `PARTIAL`, `BLOCKED`, `NOT_RUN` ya da
`credential_not_configured` olarak kalır.

Bir yardımcı ortamın (GitLab, Forgejo, Windows/Docker, local AI veya private
runner) erişilememesi GitHub’daki bağımsız işlerin durmasına gerekçe değildir.
Ancak yardımcı ortam kanıtı eksikse ilgili entegrasyon kapısı `NOT_RUN` veya
`BLOCKED` olarak tutulur.

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
