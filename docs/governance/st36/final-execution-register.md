# MouseAI ST3.6 — Tek Master Yürütme ve Kapanış Kaydı

**Sürüm:** 1.0  
**Kapsam:** Ana kanun, şartname, kabul planı, kontrol matrisi, diyagram atlası, görev kayıtları, KPI ve finans şablonu  
**Repo:** `hakimceliker/mauseai`  
**Yürütme ilkesi:** İşler tek tek dağınık raporlanmaz; bu kayıt tüm işlerin ortak durum kaynağıdır.

## Kanonik kaynak ve runtime zinciri

```text
GitHub Source of Truth
↕
GitLab Secondary CI / private pipeline / mirror-backup
↕
Forgejo local/private mirror + DR + local CI
↕
Windows/Docker local runtime
↕
Ollama/Qwen local-first
↕
NVIDIA NIM / OpenAI / Claude / Cloudflare fallback/scale
↕
Doctor / Observability / Watchdog / Recovery
↕
Judge / Evidence / Audit / Human Approval
```

GitLab, Forgejo ve yerel sonuçlar yardımcı kanıttır. Her sonuç kanonik GitHub
branch/SHA ile uzlaştırılana kadar `REVIEW`, `STALE` veya `BLOCKED` kalır; hiçbir
yardımcı ortam tek başına merge, production kabulü veya `CLOSED` üretemez.

## Güncel yürütme özeti — 2026-10-01 20:16 UTC

| Task | Owner | Branch | PR | Commit | Test | CI | Evidence | Status | Blocker | Next |
|---|---|---|---|---|---|---|---|---|---|---|
| Current main and production reconciliation | GPT/Codex | `main` | #96 merged | `04256ac21a1c95da957fab501fc87c7acdf4cdd2` | Health and readiness HTTP 200 | Main quality, audit, secret scan, Docker, CodeQL PASS | [`docs/evidence/README.md`](../../evidence/README.md) | VERIFIED (technical/health only) | Live acceptance gates remain | Add independent maintainer; review #92 and #95 |
| Local-first AI routing and cost telemetry | GPT/Codex | `codex/mauseai-local-ai-security-20261001` | #92 open | `7c8d2fbe23548ffdd26060a9f9114e7a8efb30d9` | Local zero API cost and cloud fallback tests in CI | CI and CodeQL PASS | [PR #92](https://github.com/hakimceliker/mauseai/pull/92) | READY_FOR_REVIEW | No independent reviewer | Review, then merge if all gates remain green |
| Workspace design and acceptance tooling | GPT/Codex | `chore/windows-acceptance-wrapper` | #95 open | `2fe1b005e010f69d371f54c32c7497bd32cba769` | CI suite PASS | CI and CodeQL PASS | [PR #95](https://github.com/hakimceliker/mauseai/pull/95) | READY_FOR_REVIEW | No independent reviewer | Review, then merge if all gates remain green |
| Consolidated merge candidate | Claude/Codex | `claude/merge-queue-integration` | #114 open | `39a097b` | Consolidates PRs #92–#111; live gates remain NOT_RUN | Captured GitHub checks successful; independent approval not recorded | [PR #114](https://github.com/hakimceliker/mauseai/pull/114) | REVIEW | Independent maintainer review required; not merged | Review, rerun required checks after any head update, then merge only if protection permits |
| Repository governance controls | GPT/Codex | `chore/repository-governance-controls` → `hakimceliker-mouseai-kanun-uyarlamasi` | #97 open | New commit pending | YAML/JSON/config and diff validation | CI reruns after update | [PR #97](https://github.com/hakimceliker/mauseai/pull/97); evidence index | IN_PROGRESS | Independent review required | Integrate changes, then await checks and independent review |
| Live Auth/RLS and Inngest acceptance | Product owner + Supabase + Inngest | — | — | — | NOT_RUN | — | PLAN-004/005 runbooks | BLOCKED | Approved test credentials and workflow ID | Run only with approved test identities |

Production-ready remains **NOT ACCEPTED**. A green health endpoint or CI run does not prove Auth/RLS, tenant isolation, live workflow, provider, pilot, finance, or operating acceptance.

## 1. Kaynakların birleştiği merkez

Bu kayıt aşağıdaki kaynakları tek yürütme görünümünde birleştirir:

- ST3.6 ana kanun ve uygulanabilirlik matrisi
- MouseAI master şartname
- Eksikler ve kabul planı
- Diyagram atlası
- Ana kayıt ve teslim doğrulama JSON’ları
- 14 günlük teknik spesifikasyon
- Ürün/iş/finans/KPI belgeleri
- Repo’daki migration, API, worker, test ve CI kanıtları

Repo kopyaları: `docs/governance/st36/`  
Kanun: [`storage-and-repository-registry.md`](../../storage-and-repository-registry.md)

Faz yürütme sırası ve tikli görev listesi: [`mouseai-master-phase-plan-v1.0.md`](../../mouseai-master-phase-plan-v1.0.md)

## 2. Genel durum

| Alan | Durum | Kapanış şartı |
|---|---|---|
| Kod ve mimari | Hazır/CI doğrulandı | Main CI ve PR kanıtı |
| Güvenlik ve secret politikası | Hazır | Secret scan + insan incelemesi |
| Repo/branch/depo yönetimi | Kanunlaştırıldı | Kanuna uygun her PR |
| 377 kontrol | Repo’ya aktarıldı | Sorumlu + kanıt + kabul |
| G0–G12 kapıları | Beklemede | Her kapının kanıt dosyası |
| Auth/tenant | Canlı kanıt bekliyor | A/B negatif testleri |
| Inngest | Canlı run bekliyor | Trigger/worker/checkpoint/audit |
| AI provider | Canlı credential testi bekliyor | OpenAI + Anthropic redacted test |
| Storage | Aktif akış yok | PLAN-004B açılmadan kullanılmaz |
| Ödeme | Sandbox/mock sınırında | Stripe sandbox replay |
| KPI/finans | Şablon var, veri yok | Baseline + hedef + sahip |
| Pilotlar | Hazırlık seviyesinde | Gerçek pilot kanıtı |
| Hukuk/operasyon | Dokümantasyon bekliyor | Yayın ve incident kabulü |

## 3. Uygulama paketleri

### P0 — Canlı kabul yolu

| Paket | Görev | Sahip | Durum |
|---|---|---|---|
| PLAN-001 | Proje kartı, bütçe, sorumlu, tarih | Kullanıcı/ürün sahibi | Kullanıcı kararı bekliyor |
| PLAN-002 | Müşteri ve süreç baz ölçümü | Ürün/satış | Veri bekliyor |
| PLAN-003 | Repo, branch, PR, CI ve ortam envanteri | Codex | Hazır |
| PLAN-004 | Auth, iki tenant, RLS ve çapraz erişim | Codex + Supabase | Canlı test bekliyor |
| PLAN-004B | Repo/Storage/bucket/path yönetimi | Codex + Supabase | Kanun hazır, Storage NOT_RUN |
| PLAN-005 | Inngest trigger, worker, checkpoint, retry, duplicate | Codex + Inngest | Canlı run bekliyor |
| PLAN-006 | OpenAI/Anthropic gerçek çağrısı | Codex + kullanıcı | Credential bekliyor |
| PLAN-007 | Audit ve maliyet uzlaştırması | Codex + finans | P005/P006 bağımlı |

### P1–P9 — Diğer tüm kapsam

| Paket | İçerik | Ön koşul | Durum |
|---|---|---|---|
| P1 | API sözleşmeleri, tool kataloğu, approval/handoff, log redaction | P0 | Kod temeli var, kabul kanıtı bekliyor |
| P2 | API bakım pilotu | P0/P1 | Pilot run bekliyor |
| P3 | Windows bilgisayar runner’ı | P0/P1 | Cihaz pilotu bekliyor |
| P4 | Verifier, UNKNOWN, bounded retry, rollback | P005 | Tasarım mevcut, failure run bekliyor |
| P5 | Ortak çalışma, hafıza, provenance, devralma | P0/P1 | Uygulamalı test bekliyor |
| P6 | Eval, kalite metriği, model yöntemi, canary | P006 | Veri seti ve baseline bekliyor |
| P7 | BI, KPI, finans, fiyat ve unit economics | P002 | Gerçek ölçüm bekliyor |
| P8 | Hukuk, release, backup/restore, incident, destek | P0/P7 | Operasyon onayı bekliyor |
| P9 | Enterprise SSO/SCIM, özel tenant, residency, marketplace | P8 + müşteri talebi | MVP sonrası |

## 4. Paralel yürütme

Aşağıdakiler aynı anda hazırlanabilir:

- UI ve beyaz/şeffaf tasarım uygulaması
- KPI sözlüğü ve finans workbook’u
- Tool/connector kataloğu
- Threat model ve güvenlik testleri
- API bakım pilotu taslağı
- Hukuk ve destek kontrol listeleri
- Site, SEO, demo ve satış materyali

Şunlar bağımlılık kapanmadan başlatılamaz:

- Auth olmadan tenant kabulü
- Tenant kabulü olmadan canlı Inngest kabulü
- Inngest olmadan audit/cost uzlaştırması
- Gerçek provider olmadan gerçek maliyet doğrulaması
- Pilot ölçümü olmadan fiyat/SLA kararı
- P0 kapanmadan gerçek müşteri verisi ve canlı ödeme

## 5. Her görev için zorunlu teslim

Her PLAN/ADAPT maddesi aşağıdaki teslim zincirini izler:

```text
Issue
→ branch
→ kod/doküman/migration
→ test
→ security review
→ PR
→ CI
→ commit kanıtı
→ redacted evidence
→ kabul sahibi ve tarih
→ merge
→ main/production doğrulaması
```

Test veya kanıt yoksa görev tamamlanmış sayılmaz.

## 6. Tek final kabul kapısı

```text
G0–G6: ürün, kapsam, mimari ve güvenlik
G7: Auth + tenant + Storage sınırı
G8: Inngest + checkpoint + audit + idempotency
G9: provider + maliyet + gözlemlenebilirlik
G10: pilot + KPI + finans
G11: hukuk + release + rollback
G12: operasyon + müşteri kabulü
```

Final kabul yalnızca bütün ilgili kapılar için kanıt bulunduğunda verilir. Eksik credential veya çalıştırılmamış test `NOT_RUN`, `BLOCKED` veya `credential_not_configured` olarak kalır.

## 7. Sonraki yürütme sırası

1. Add an independent maintainer; do not bypass the required review.
2. Review PRs #92 and #95; merge only after approval and all required checks are green.
3. Merge the governance-controls PR only after its review and checks pass.
4. After each merge, verify main CI, CodeQL, secret scan, Docker, dependency audit, Vercel deployment, health and readiness.
5. Execute PLAN-004 Auth/tenant tests and PLAN-005 Inngest acceptance with approved credentials/workflow IDs.
6. Complete provider/integration, pilot/KPI, finance, backup/restore, rollback, legal and operational evidence.
7. Evaluate G0–G12; retain `PARTIAL — NOT PRODUCTION-READY` until all required evidence and human acceptance exist.

## 8. Raporlama standardı

Bundan sonraki rapor tek tabloda şu alanları taşıyacaktır:

```text
Task | Owner | Branch | PR | Commit | Test | CI | Evidence | Status | Blocker | Next
```

Bu dosya güncellenmeden ayrı parça “tamamlandı” raporu verilmez.

## 9. 2026-10-01 yürütme kanıtı

| Kontrol | Sonuç | Kanıt / not |
|---|---|---|
| Supabase profil eşlemesi | PASS | İki test kullanıcısı Tenant A/B ile `owner` rolüne bağlandı ve SQL Editor üzerinden doğrulandı |
| Lint | PASS | `npm run lint` |
| Typecheck | PASS | `npm run typecheck` |
| Test | PASS | 28 test dosyası, 266 başarılı; 16 skip |
| Build | PASS | `npm run build` |
| Diff kontrolü | PASS | `git diff --check` |
| Dependency audit | PASS | `npm audit --omit=dev --audit-level=high`, 0 vulnerability |
| Production acceptance runner | PARTIAL | Production base URL ile health/readiness/anonymous erişim kontrolleri PASS |
| Auth/tenant canlı API testi | credential_not_configured | `SMOKE_USER_A_TOKEN`, `SMOKE_USER_B_TOKEN` yok |
| Inngest canlı workflow | credential_not_configured | `SMOKE_WORKFLOW_ID`, runtime Inngest erişimi yok |
| Gerçek AI provider testi | credential_not_configured | OpenAI/Anthropic runtime credential kanıta alınmadı |

Bu kayıt secret, token, parola veya ham production response içermez. Auth profil eşlemesi tamamlanmış olsa da canlı API/RLS ve Inngest kabul kapıları kanıtlanmadan production kabulü verilmez.

## 10. Current main and production evidence — 2026-10-01 20:16 UTC

- `main`: `04256ac21a1c95da957fab501fc87c7acdf4cdd2`, merged via PR #96.
- Main CI `36915074789`: `quality`, `dependency-audit`, `secret-scan`, and `docker` all passed.
- Main CodeQL `36915074754`: passed.
- Vercel production deployment `6793405140`: success for the current main commit.
- Production health at `20:16:21 UTC`: HTTP 200, `healthy`, database `ready`.
- Production readiness: HTTP 200, `ready: true`.
- PR #92 and #95 each have passing CI/security/preview checks but remain open pending independent review; PR #97 is also open and review-gated.
- Seven duplicate issues are closed; canonical issues #53–#63 have owner and milestone. Stale draft PRs #64–#74 are closed with branches preserved.
- The full row-oriented evidence index is [`../../evidence/README.md`](../../evidence/README.md).

## 11. Repository settings re-verification — 2026-10-01 20:26 UTC

- `main-protection` is active with one required approval and all six required checks; force-push and branch deletion are blocked.
- Actions default token permissions are read-only, PR approval is disabled, and `security-events: write` is limited to CodeQL.
- Private vulnerability reporting is enabled.
- Only the PR author is a direct collaborator, so independent review and merges remain blocked.
