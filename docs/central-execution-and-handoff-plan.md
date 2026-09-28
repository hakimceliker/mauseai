# MouseAI — Merkezi Çalışma, Teslim ve Birleştirme Planı

Bu belge, MouseAI’de GPT/Codex, Claude Code, Supabase, Vercel, Inngest ve diğer araçların aynı proje üzerinde nasıl birlikte çalışacağını tanımlar.

## 1. Tek gerçek kaynak

Kod ve kararların ortak merkezi GitHub repository’sidir:

`https://github.com/hakimceliker/mauseai`

Merkezi kayıt dosyaları:

- `docs/document-inventory.md` — belge numarası ve güncel kaynak kaydı
- `docs/task-registry.md` — görev sahibi, durum ve teslim kaydı
- `docs/change-control.md` — çelişki ve değişiklik onayı
- `docs/ai-tool-role-matrix.md` — araç yetki sınırları
- `docs/execution-and-tool-responsibility-plan.md` — işletim ve teslim yöntemi

Hiçbir görev yalnızca sohbet içinde tamamlanmış sayılmaz.

## 2. Zorunlu görev akışı

```text
Issue
→ görev kartı
→ feature branch
→ uygulama
→ test ve kanıt
→ doküman güncellemesi
→ Pull Request
→ Claude incelemesi
→ CI
→ entegrasyon
→ main CI
→ production doğrulaması
→ teslim raporu
```

Main’e doğrudan push yasaktır. Secret değerleri GitHub’a, kod içine, log’a veya belgeye yazılamaz.

## 3. Fazlar ve bağımlılık kapıları

### Aşama 0 — Merkezi hazırlık

Sahip: GPT/Codex. Denetçi: Claude.

- Belge envanterini güncelle
- Faz ve görev ID standardını kilitle
- Her görev için sahip, reviewer, çıktı ve kabul kriteri tanımla
- Branch/PR/CI/merge kanununu uygula
- Proje ve secret ayrılığını doğrula

Bu aşama tamamlanmadan paralel uygulama işleri başlamaz.

### Aşama 1 — Bağımsız paketler

Aşağıdaki işler aynı anda yürüyebilir:

- GPT/Codex: kod, API, test ve migration taslağı
- Claude: mimari ve güvenlik kontrol listesi
- Supabase: migration/RLS hazırlığı
- Vercel: deployment ve environment kontrol listesi
- Inngest: event/workflow taslağı
- OpenAI/Anthropic: provider sözleşmeleri
- Visily/Figma: UI tasarım sistemi
- Sentry/Langfuse/PostHog: gözlemleme planı
- Stripe: sandbox ödeme planı

Her paket kendi branch’inde çalışır; başka paketin branch’ine yazamaz.

### Aşama 2 — Bağımlı entegrasyonlar

Zorunlu sıra:

```text
Supabase migration
→ Auth/RLS/tenant
→ API
→ AI Router
→ Vercel deployment
→ Inngest sync
→ gerçek AI çağrısı
→ task/checkpoint testi
→ ödeme ve müşteri connector’ları
```

### Aşama 3 — Merkezi birleştirme

1. Tüm paket PR’ları açılır.
2. Claude review tamamlanır.
3. CI yeşil olur.
4. PR’lar bağımlılık sırasına göre merge edilir.
5. Main CI çalışır.
6. Vercel production deploy edilir.
7. Inngest resync yapılır.
8. Production smoke ve UAT çalıştırılır.

## 4. Araç görevleri

### GPT/Codex

Okur: D01, D05, D10, D11, D12, D14, D16, D20.

Üretir: kod, migration, API, test, CI, teknik doküman, runbook.

Yasak: main push, secret gösterme, ödeme açma, hukuki karar, gerçek müşteri verisi.

Teslim: branch, PR, dosya listesi, test kanıtı, CI sonucu, rollback ve kalanlar.

### Claude/Claude Code

Okur: D01, D12, D13, D14, D15, D20, D21, D22, D29, D30.

Denetler: diff, mimari, güvenlik, RLS, tenant, secret, test, CI ve production riskleri.

Yasak: onaysız deploy, main push, secret isteme/gösterme, müşteri adına bağlayıcı işlem.

Teslim: bulgu seviyesi, dosya/satır, risk, düzeltme önerisi ve merge kararı.

### Kullanıcı

Secret girişleri, hesap/ödeme onayları, hukuki/ticari kararlar, tasarım ve go-live kabulü kullanıcıya aittir. Secret sohbet içinde paylaşılmaz.

### Supabase

Auth, PostgreSQL, tenant, RLS, Storage, Realtime, migration, backup ve restore kanıtı sağlar.

### Vercel

Preview/production deploy, environment değişkenleri, domain, SSL, build, rollback ve health kanıtı sağlar.

### Inngest

Event routing, durable workflow, retry, timeout, checkpoint, idempotency, concurrency ve failure kanıtı sağlar.

### OpenAI/Anthropic

Provider çağrısı, model sözleşmesi, token/maliyet ölçümü, timeout, retry ve güvenli hata davranışı sağlar.

### Stripe

Sandbox/production ödeme, webhook, iade, abonelik ve wallet ledger mutabakatı sağlar. Gerçek para hareketi kullanıcı onayı olmadan açılamaz.

### Visily/Figma

Beyaz/şeffaf MouseAI arayüzü, design token, component, responsive ve frontend handoff üretir.

### Sentry/Langfuse/PostHog

Sırasıyla runtime hata, AI trace/maliyet ve ürün analitiği sağlar. Hassas veri maskelenir.

## 5. Görev kartı formatı

```yaml
task_id: CORE-000
title: ""
owner: "gpt|claude|supabase|vercel|inngest|openai|anthropic|stripe|design|observability|human"
reviewer: ""
phase: ""
source_documents: [D01]
inputs: []
allowed_tools: []
forbidden_actions: []
acceptance_criteria: []
required_evidence: []
handoff_to: ""
rollback: ""
status: "todo|in_progress|ready|blocked|merged"
```

## 6. Teslim raporu formatı

```markdown
# TASK-ID — Teslim Raporu

## Sorumlu
## Okunan belgeler
## Değiştirilen dosyalar
## Yapılan işlem
## Testler ve sonuçlar
## PR linki
## CI linki
## Deployment/servis kanıtı
## Riskler
## Kalanlar
## Sonraki görev
## Sonuç: READY | BLOCKED | NEEDS_APPROVAL
```

## 7. Tamamlanma şartı

Bir iş ancak şu koşullarda tamamlanır:

```text
Doğru proje doğrulandı
+ doğru branch kullanıldı
+ dosya ve belge güncellendi
+ test kanıtı var
+ PR açıldı
+ Claude review tamamlandı
+ CI başarılı
+ main CI başarılı
+ production kanıtı var
= tamamlandı
```

Eksik credential, test kullanıcısı, ödeme hesabı veya hukuki onay varsa sonuç `BLOCKED` ya da `NEEDS_APPROVAL` olarak raporlanır; uydurma başarı yazılmaz.

