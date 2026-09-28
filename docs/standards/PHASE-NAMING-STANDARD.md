# MauseAI Faz Adlandırma Standardı

## 1. Genel Yapı

MauseAI projesi iki seviyeli yapıya sahiptir:

```
Aşama (Stage) — Büyük dönem (0, 1, 2, 3)
    └─ Faz (Phase) — Alt dönem (Faz 0, 1, 2, ..., 14)
```

## 2. Aşamalar (Stages)

| Aşama | Türkçe | Dönem | Hedef |
|---|---|---|---|
| **0** | Merkezi Hazırlık | Cuma 28 Eylül - ? | Doküman, standart, koordinasyon hazırlığı |
| **1** | Temel Kurulum | ? | MVP framework + 14 Faz |
| **2** | MVP Geliştirme | ? | Production-ready uygulamalar |
| **3** | Ürün ve İşletme | ? | Go-live, operasyon, ölçekleme |

## 3. Fazlar (Phases) — Aşama 1 İçinde

Aşama 1, 14 paralel/seri faza bölünmüştür. Adlandırma:

```
Faz N — [Türkçe Adı]
```

| Faz | Türkçe Adı | Dosya | Görev |
|---|---|---|---|
| **0** | MVP Kurulumu | Faz 0 | main branch, CI/CD, temel setup |
| **1** | Repository Skeleton | feature/faz-1-repo-skeleton | Proje yapısı, deps |
| **2** | Domain Contracts | feature/faz-2-domain-contracts | Veri modelleri, API sözleşmeleri |
| **3** | Task API | feature/faz-3-task-api | Task CRUD, orchestration API |
| **4** | Database Schema | feature/faz-4-database-schema | Supabase RLS, migration |
| **5** | Inngest Worker | feature/faz-5-inngest-worker | Event queue, async jobs |
| **6** | Retry & Idempotency | feature/faz-6-retry-idempotency | Durability, circuit breaker |
| **7** | AI Router | feature/faz-7-ai-router | GPT/Claude seçimi, orchestration |
| **8** | Cost Tracking | feature/faz-8-cost-tracking | Cost metering, telemetry |
| **9** | Webhooks & Callbacks | feature/faz-9-webhooks | External integrations |
| **10** | Conversations | feature/faz-10-conversations | Chat history, context |
| **11** | Offers & Pricing | feature/faz-11-offers | Teklif motoru, fiyatlandırma |
| **12** | Auth & RLS | feature/faz-12-auth-rls | Supabase JWT, row-level security |
| **13** | E2E Tests | feature/faz-13-e2e-tests | Cypress/Playwright tests |
| **14** | Demo UI | feature/faz-14-demo-ui | Next.js UI, customer portal |

## 4. Branch Adlandırması

### Faz Branches

```
feature/faz-N-kebab-case-name
```

Örnekler:
- `feature/faz-1-repo-skeleton`
- `feature/faz-7-ai-router`
- `feature/faz-14-demo-ui`

### Aşama 0 Branches

```
feat/MOUSE-NNN-short-description
```

Örnekler:
- `feat/MOUSE-001-central-preparation`
- `stage/0-central-preparation`

## 5. Görev Kimliği (TASK-ID) Eşlemesi

| Aşama | Faz | TASK-ID Aralığı | Notlar |
|---|---|---|---|
| **0** | — | MOUSE-001 to MOUSE-010 | Merkezi hazırlık belgeleri |
| **1** | 0 | MOUSE-011 to MOUSE-015 | MVP kurulumu, CI/CD |
| **1** | 1-14 | MOUSE-020 to MOUSE-100 | Her faz ayrı görev serileri |
| **2** | — | MOUSE-101 to MOUSE-200 | Geliştirme ve iyileştirme |
| **3** | — | MOUSE-201+ | Go-live ve operasyon |

Örnek Harita:
- MOUSE-001 = Aşama 0, Merkezi Hazırlık
- MOUSE-020 = Aşama 1, Faz 1, Repository Skeleton
- MOUSE-030 = Aşama 1, Faz 2, Domain Contracts
- MOUSE-101 = Aşama 2, Başlama

## 6. İssue ve PR Başlıkları

### Faz Seviyesi

```
MOUSE-0NN — Faz N: [Başlık]
```

Örneğin:
- `MOUSE-020 — Faz 1: Repository Skeleton`
- `MOUSE-070 — Faz 7: AI Router`

### Aşama 0 Seviyesi

```
MOUSE-00N — Aşama 0: [Belge Adı]
```

Örneğin:
- `MOUSE-001 — Aşama 0: Central Preparation`
- `MOUSE-005 — Aşama 0: Standards`

## 7. Dosya Yolu Kuralları

### Belge Klasörleri

```
docs/D01-final-constitution.md
docs/D12-task-registry.md
docs/D13-change-control.md
docs/D14-ai-tool-role-matrix.md
docs/D15-gpt-claude-separation.md
docs/D20-ai-task-authority-law.md

docs/standards/
  TASK-ID-STANDARD.md
  PHASE-NAMING-STANDARD.md
  FILE-OWNERSHIP.md
  PR-CI-RULES.md
  SECRET-LAW.md

docs/evidence/
  STAGE-0-CENTRAL-PREP.md
  STAGE-1-FAZ-0.md
  ... (her faz için)

docs/DELIVERY-TEMPLATE.md

.github/
  TASK-ISSUE-TEMPLATE.md
  PULL_REQUEST_TEMPLATE.md
```

### Kod Klasörleri

```
src/
  orchestrator/       # MOUSE-020, Task API
  domain/            # MOUSE-030, Domain Contracts
  ai-router/         # MOUSE-070, AI Router
  costs/             # MOUSE-080, Cost Tracking
  conversations/     # MOUSE-100, Conversations
  offers/            # MOUSE-110, Offers
  auth/              # MOUSE-120, Auth & RLS
```

## 8. Türkçe vs İngilizce Kullanımı

| Bağlam | Dil | Örnek |
|---|---|---|
| Aşama adı | Türkçe | "Aşama 0: Merkezi Hazırlık" |
| Faz adı | Türkçe/İngilizce mix | "Faz 7: AI Router" |
| Branch adı | İngilizce | `feature/faz-7-ai-router` |
| Issue/PR | İngilizce başlık + Türkçe açıklama | `MOUSE-070 — AI Router` |
| Kod yorum | Türkçe | `// GPT-Claude router seçimi` |
| Belge | Türkçe | `docs/D07-ai-router-rules.md` |

## 9. Kronoloji ve Bağımlılık

```
Aşama 0 (MOUSE-001 to MOUSE-010)
  │
  ├─→ Aşama 1 (MOUSE-020+)
  │   │
  │   ├─→ Faz 1: Repository Skeleton (MOUSE-020)
  │   ├─→ Faz 2: Domain Contracts (MOUSE-030)
  │   ├─→ Faz 3-8: Core (MOUSE-040 to MOUSE-090)
  │   └─→ Faz 9-14: Features (MOUSE-100 to MOUSE-150)
  │
  └─→ Aşama 2 (MOUSE-200+)
      └─→ Aşama 3 (MOUSE-300+)
```

## 10. Taraftar Kısaltmaları

| Kısaltma | Anlamı | Örnek |
|---|---|---|
| **Stage** | Aşama (0, 1, 2, 3) | Stage 0, Stage 1 |
| **Phase** | Faz (0-14 içinde Stage 1) | Phase 1, Phase 14 |
| **Task** | Görev (MOUSE-NNN) | TASK-001 |
| **PR** | Pull Request | #42 |
| **Issue** | GitHub Issue | #101 |
| **Faz-N** | Türkçe faz referansı | Faz-1, Faz-14 |

## 11. Araçlar

### GitHub Labels

```
stage/0, stage/1, stage/2, stage/3
phase/1, phase/2, ... phase/14
type/doc, type/code, type/test
priority/p0, priority/p1, priority/p2
status/ready, status/in-progress, status/blocked
```

### GitHub Milestones

```
Aşama 0: Merkezi Hazırlık
Aşama 1: Temel Kurulum (Faz 1-14)
Aşama 2: MVP Geliştirme
Aşama 3: Ürün ve İşletme
```

## Kaynaklar

- [TASK-ID-STANDARD.md](./TASK-ID-STANDARD.md)
- [D01 - Final Constitution](../D01-final-constitution.md)
- [Task Registry](../D12-task-registry.md)
- [PR-CI-RULES.md](./PR-CI-RULES.md)
