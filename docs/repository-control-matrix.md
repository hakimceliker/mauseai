# Repository Control Matrix

**Repository:** `hakimceliker/mauseai`  
**Snapshot date:** 2026-10-01  
**Source of truth:** GitHub `main`, open PRs, CI checks, deployment evidence, and linked runbooks.

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
