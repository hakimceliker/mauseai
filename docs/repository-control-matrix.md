# Repository Control Matrix

**Repository:** `hakimceliker/mauseai`  
**Snapshot date:** 2026-10-01 20:16 UTC
**Source of truth:** GitHub `main`, open PRs, CI checks, deployment evidence, and linked runbooks.

## Latest verified snapshot

- `main`: `04256ac21a1c95da957fab501fc87c7acdf4cdd2`.
- PR #92: CI, CodeQL, secret scan, dependency audit, Docker, and preview passed; independent review pending.
- PR #95: CI, CodeQL, secret scan, dependency audit, Docker, and preview passed; independent review pending.
- PR #97: active governance/source-reconciliation and Local AI fallback PR; this governance work is being folded into it to avoid parallel status-record edits; independent review pending.
- Production deployment: Vercel deployment `6793405140` for the current main commit succeeded.
- Production smoke at `2026-10-01 20:16 UTC`: `/api/health` and `/api/health/ready` returned HTTP 200; database ready and `ready: true`.
- Active `main-protection`: PR and one approval required; `quality`, `CodeQL`, `secret-scan`, `dependency-audit`, `docker`, and `Vercel` required; force-push and branch deletion blocked.
- Sole listed collaborator is `hakimceliker`, the author of PRs #92, #95, and #97. Independent review cannot be self-approved.
- Duplicate issues #42, #43, #45, and #49–#52 are closed in favor of canonical issues #53, #54, #56, and #60–#63. Stale package draft PRs #64–#74 are closed with their branches preserved.
- See [`evidence/README.md`](evidence/README.md) for the run/deployment links and rollback notes.

## GitHub Actions and dependency controls

- Repository Actions are enabled. Default `GITHUB_TOKEN` permissions are read-only, and workflows cannot approve pull requests.
- `security-events: write` is granted only to the CodeQL workflow; other workflows use read-only permissions.
- The CI secret-scan job uses only the automatically provided `GITHUB_TOKEN`; no repository provider credential is passed to CI.
- Workflows run on `pull_request`, not `pull_request_target`; GitHub does not expose repository secrets to fork pull requests.
- Dependabot vulnerability alerts and automated security fixes are enabled.
- GitHub private vulnerability reporting is enabled; security disclosures should use the repository's private advisory channel rather than a public issue.
- Dependabot checks npm and GitHub Actions weekly. A separate monthly workflow reports available npm major versions for explicit review without applying them.
- `main-protection` requires `quality`, `CodeQL`, `secret-scan`, `dependency-audit`, `docker`, and `Vercel`, plus one approval.

## Canonical records

| Record | Canonical location |
|---|---|
| Current status | [`PROJECT_STATUS.md`](../PROJECT_STATUS.md) |
| Phase plan | [`mouseai-master-phase-plan-v1.0.md`](mouseai-master-phase-plan-v1.0.md) |
| Gap roadmap | [`mouseai-master-gap-roadmap-v1.1.md`](mouseai-master-gap-roadmap-v1.1.md) |
| Production smoke | [`production-smoke-runbook.md`](production-smoke-runbook.md) |
| Auth/RLS acceptance | [`plan-004-auth-tenant-runbook.md`](governance/st36/plan-004-auth-tenant-runbook.md) |
| Inngest acceptance | [`plan-005-inngest-acceptance-runbook.md`](governance/st36/plan-005-inngest-acceptance-runbook.md) |
| Tool/integration inventory | [`available-tools-inventory.md`](available-tools-inventory.md) |

## Phase truth table

| Phase | Main implementation | Acceptance state | Rule |
|---|---|---|---|
| 0 — Governance | Merged | DONE | PR/CI/document ownership established |
| 1 — Foundation | Merged and CI-green | DONE | Lint, typecheck, test, build, audit, scan, Docker |
| 2 — Auth/Tenant | Mapping exists; live tests pending | PARTIAL | No production acceptance without isolation proof |
| 3–12 | Planned/partially implemented | NOT CLOSED | Must be tied to a merged commit and evidence file |

## External integration evidence contract

Each integration gets one row in the current evidence file/runbook with: environment, endpoint/app, date, actor, result, sanitized request/response summary, link, and rollback. Secret values and raw tokens are never recorded.

| Integration | Current evidence | Required next proof |
|---|---|---|
| Supabase | Project and profile mappings exist | Auth login, two-tenant isolation, forbidden read/write |
| Vercel | Production health/readiness and preview deployments | Deployment SHA and env presence without values |
| Inngest | Endpoint availability and acceptance runbook | Real trigger, worker, checkpoint, audit, retry/idempotency |
| OpenAI | Adapter/test paths | Runtime provider test or `credential_not_configured` |
| Anthropic | Adapter/test paths | Runtime provider test or `credential_not_configured` |
| Stripe | Sandbox/mock boundary | Sandbox webhook/payment test; no live charge |
| PostHog | Integration plan | Sanitized event delivery proof |
| Sentry/Langfuse | Trace/error plan | Sanitized error and AI trace proof |

## Cleanup policy

- One canonical issue and one canonical PR per active work package.
- Old duplicate issues/PRs are closed with a pointer to the canonical record; they are not merged.
- Draft PRs are not evidence of completion.
- A branch not merged into `main` is not complete.
- A passing CI run is technical evidence, not production acceptance.
- Keep PR branches and evidence for open work; do not delete branches as part of cleanup.
- Close stale package PRs only with a comment that preserves the work-package link and directs reimplementation from current `main`.
