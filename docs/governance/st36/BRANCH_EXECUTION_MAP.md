# MouseAI — Kanonik Branch Execution Map

Bu kayıt, MouseAI projesinin G0–G12 kapılarını ve teknik paketlerini ayrı, izlenebilir branch/PR teslimlerine böler. Aynı işi yapan eski dallar yeniden kullanılmaz; yalnızca bu tabloda kanonik olarak seçilen dal güncel kabul edilir.

## Değişmez kurallar

- Her branch tek bir amaç taşır.
- Branch doğrudan `main`e push etmez; yalnızca PR ile birleşir.
- Her PR kendi test, kanıt ve rollback kaydını taşır.
- CI, CodeQL, secret scan, dependency audit ve Docker kapıları geçmeden merge edilmez.
- Canlı credential, pilot, finans veya insan onayı gerektiren kapılar kanıt olmadan `PASSED` yazılmaz.
- Eski/duplicate branch silinmez; önce kanonik eşleştirme ve güvenli kapanış kararı kaydedilir.

## Kanonik entegrasyon sırası

```text
main
 ├─ 01-governance-foundation       → G0–G4
 ├─ 02-architecture-contracts      → G5–G6
 ├─ 03-auth-tenant-rls             → G7
 ├─ 04-durable-workflow            → G8
 ├─ 05-provider-observability      → G9
 ├─ 06-pilot-kpi-finance           → G10
 ├─ 07-release-legal-support       → G11
 └─ 08-operating-acceptance        → G12

cross-cutting PRs:
   ui-canonical-design · security-controls · repository-governance
```

## Faz ve branch matrisi

| Sıra | Kanonik branch | Kapı/faz | Sorumluluk | Ana alanlar | Kabul kapısı | Durum |
|---:|---|---|---|---|---|---|
| 1 | `stage/g0-g4-governance-foundation` | G0–G4 | sahiplik, ihtiyaç, model, kapsam, bütçe | `docs/governance/st36/`, `PROJECT_STATUS.md`, `ACCEPTANCE_REPORT.md` | karar kaydı + bütçe + pilot charter | karar/insan girdisi bekliyor |
| 2 | `stage/g5-g6-architecture-contracts` | G5–G6 | mimari, güvenlik, API/veri/workflow sözleşmeleri | `ARCHITECTURE.md`, `docs/architecture/`, `src/lib/` | mimari inceleme + contract testleri | teknik temel mevcut, uzlaştırma gerekli |
| 3 | `stage/g7-auth-tenant-rls` | G7 | Auth, tenant izolasyonu, RLS, storage | `supabase/`, `src/lib/auth/`, `src/app/api/` | iki tenant + negatif erişim testi | canlı credential bekliyor |
| 4 | `stage/g8-durable-workflow` | G8 | Inngest trigger, worker, checkpoint, retry, idempotency, rollback | `src/inngest/`, `src/app/api/inngest/`, `supabase/migrations/` | gerçek production run kanıtı | canlı workflow erişimi bekliyor |
| 5 | `stage/g9-provider-observability` | G9 | OpenAI, Anthropic, local fallback, maliyet, trace | `src/lib/ai/`, `src/lib/observability/`, `src/app/api/` | provider çağrısı + maliyet/trace kanıtı | credential/ortam bekliyor |
| 6 | `stage/g10-pilot-kpi-finance` | G10 | iki pilot, baseline, KPI, 13 haftalık finans | `docs/pilot/`, `docs/finance/`, `docs/kpi/` | gerçek kullanıcı sonucu + fayda ölçümü | pilot ve işletme girdisi bekliyor |
| 7 | `stage/g11-release-legal-support` | G11 | yayın, hukuk, destek, rollback, release SOP | `docs/release/`, `docs/legal/`, `RUNBOOK.md` | yayın checklist + rollback tatbikatı | kayıt ve karar bekliyor |
| 8 | `stage/g12-operating-acceptance` | G12 | işletme, müşteri kabulü, SLA, destek ve kapanış | `docs/acceptance/`, `ACCEPTANCE_REPORT.md` | imzalı işletme kabulü | G7–G11 kanıtlarına bağlı |

## Cross-cutting branch’ler

| Branch | Kapsam | Merge bağımlılığı | Not |
|---|---|---|---|
| `feature/ui-canonical-design` | dashboard, auth, task create/detail, responsive yüzeyler | bağımsız; teknik merge sonrası | Mevcut PR #98 içindeki kanonik UI commitleri bu kapsamı taşır. |
| `security/repository-controls` | branch protection, CODEOWNERS, templates, Dependabot, security policy | G0 ve review yönetişimi | Ana dal koruması ve bağımsız reviewer şartı korunur. |
| `docs/evidence-register` | evidence index, smoke kayıtları, status/reconciliation | tüm teknik PR’lara paralel | Kanıt yoksa durum `BLOCKED`/`NOT_RUN` kalır. |

## MOUSE teknik paketlerinin eşlemesi

| Paket | Kanonik teknik branch | Üst faz | Teslim |
|---|---|---|---|
| MOUSE-001 | `stage/g5-g6-architecture-contracts` | G5–G6 | kalite kapıları ve iskelet |
| MOUSE-002 | `stage/g5-g6-architecture-contracts` | G5–G6 | mimari inceleme standardı |
| MOUSE-003 | `stage/g7-auth-tenant-rls` | G7 | migration, Auth, RLS |
| MOUSE-004 | `stage/g11-release-legal-support` | G11 | Vercel deployment sözleşmesi |
| MOUSE-005 | `stage/g8-durable-workflow` | G8 | Inngest workflow |
| MOUSE-006 | `stage/g9-provider-observability` | G9 | OpenAI adapter |
| MOUSE-007 | `stage/g9-provider-observability` | G9 | Anthropic adapter |
| MOUSE-008 | `stage/g11-release-legal-support` | G11 | Stripe sandbox ve webhook |
| MOUSE-009 | `feature/ui-canonical-design` | G5–G6 | UI sistemi |
| MOUSE-010 | `stage/g9-provider-observability` | G9 | Sentry/Langfuse trace |
| MOUSE-011 | `stage/g9-provider-observability` | G9 | PostHog analytics |

## Her branch için zorunlu PR içeriği

```text
Branch:
Base branch:
Scope:
Changed files:
Tests:
Evidence file:
Rollback:
Dependencies:
Known blockers:
Reviewer:
PR:
```

## Merge sırası

1. `security/repository-controls` ve bağımsız reviewer akışı.
2. `feature/ui-canonical-design`.
3. `stage/g0-g4-governance-foundation`.
4. `stage/g5-g6-architecture-contracts`.
5. `stage/g7-auth-tenant-rls`.
6. `stage/g8-durable-workflow`.
7. `stage/g9-provider-observability`.
8. `stage/g10-pilot-kpi-finance`.
9. `stage/g11-release-legal-support`.
10. `stage/g12-operating-acceptance`.

## Gerçek durum

- Teknik UI branch kapsamı PR #98 üzerinde ilerliyor; bağımsız reviewer olmadan merge edilmez.
- G7–G9 canlı kanıtları credential ve runtime erişimine bağlıdır.
- G10–G12 gerçek pilot, finans, hukuk ve işletme kararı olmadan kapanmaz.
- Bu belge branch’leri kanonik olarak sınıflandırır; boş branch açmak tek başına fazı tamamlamaz.
