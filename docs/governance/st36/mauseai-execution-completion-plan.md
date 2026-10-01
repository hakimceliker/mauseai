# MouseAI — ST3.6 Uygulama ve Kabul Tamamlama Planı

**Repository:** `hakimceliker/mauseai`  
**Canonical branch:** `main`  
**Owner:** GPT/Codex — code, migrations, tests, CI and technical evidence  
**Review:** Claude/Copilot or human reviewer  
**Rule:** No secret is written to source, logs, commits, issues or evidence.

## 0. Status and completion rule

This plan separates implementation from live acceptance. A phase is `DONE` only
when its change is merged into `main` and its CI evidence is recorded. A live
gate is `VERIFIED` only when it has a dated, redacted runtime evidence file.
Health endpoints, preview deployments and local mocks never close live gates.

Allowed states: `PLANNED`, `IN_PROGRESS`, `DONE`, `VERIFIED`, `PARTIAL`,
`BLOCKED`, `REJECTED`.

Required phase record:

```text
Phase / gate:
Owner:
Branch:
PR:
Commit:
Files:
Commands:
Tests:
Evidence:
Rollback:
Decision:
Open risks:
Next action:
```

## 1. Delivery protocol

For every code or documentation change:

1. Confirm remote is `https://github.com/hakimceliker/mauseai`.
2. Confirm the active branch and clean/dirty state.
3. Start from the latest `origin/main`; preserve unrelated user changes.
4. Create one scoped branch using `feat/`, `fix/`, `docs/`, or `test/`.
5. Change only MouseAI files within the task boundary.
6. Add or update tests before claiming implementation complete.
7. Run `npm run verify`, security checks, audit and Docker checks.
8. Write a redacted evidence file under `docs/evidence/`.
9. Open one PR with rollback instructions and the phase record.
10. Merge only after all required checks are green and the required reviewer
    decision exists.
11. Verify `main` CI and production health after merge.
12. Update `PROJECT_STATUS.md` and `ACCEPTANCE_REPORT.md` reconciliation.

No branch is completion evidence until its PR is merged into `main`.

## 2. Dependency order

```text
G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8 → G9 → G10 → G11 → G12
                                      ↘ technical publication
```

The following may run in parallel after their prerequisites are recorded:

- documentation templates and evidence schemas;
- CI/CodeQL/Docker hardening;
- provider adapter unit tests;
- UI component work;
- KPI and finance templates;
- integration-specific runbooks.

They cannot be used to close a dependent gate before the dependency is accepted.

## 3. Gate-by-gate execution matrix

### G0 — Project opening and ownership

**Owner:** product owner + Codex.  
**Files:** `PROJECT_STATUS.md`, `docs/governance/st36/`, repository-control matrix.  
**Deliverables:** project code, owner, sponsor, scope, initial output, risk owner,
cost center, repository and start decision.  
**Acceptance:** one signed/current project card and one canonical repository.  
**Reject:** missing owner, mixed repositories, or unbounded scope.  
**Rollback:** revert only the governance documentation PR.

### G1 — Customer problem and demand

**Owner:** product/sales.  
**Deliverables:** two problem interviews or approved pilot briefs, target user,
current process, baseline time/cost, pain severity, willingness-to-test.  
**Evidence:** redacted interview records and baseline table.  
**Acceptance:** two independent problem records agree on the problem and outcome.  
**Reject:** assumptions presented as customer evidence.

### G2 — Five founding models and feasibility

**Owner:** product/finance/technical lead.  
**Deliverables:** business, product, technical, operating, risk/governance models;
assumptions; dependencies; capacity; downside scenario.  
**Financial fields:** 13-week cash flow, development cost, provider cost, cost per
user/task, pilot cost, revenue model, margin, low/base/high scenarios.  
**Acceptance:** every assumption has an owner, source, test and reject condition.

### G3 — Scope, pilot and success contract

**Owner:** product + pilot owner.  
**Files:** pilot charter, success contract, scope register.  
**Deliverables:** MVP, out-of-scope list, two pilot scenarios, baseline, target,
exit criteria, stop criteria, data and legal boundaries.  
**Acceptance:** pilot cannot start without baseline, owner and stop condition.

### G4 — Organization, budget and capacity

**Owner:** product owner/finance.  
**Deliverables:** role matrix, budget approval, provider quotas, tenant limits,
workflow concurrency, rate limits, escalation path, support owner.  
**Acceptance:** capacity limits are encoded or documented with an alert threshold.

### G5 — Architecture and security

**Owner:** Codex + reviewer.  
**Files:** `ARCHITECTURE.md`, threat model, CodeQL workflow, security evidence.  
**Checks:** lint, typecheck, tests, build, CodeQL, secret scan, npm audit, Docker,
RLS design, server-only secret boundary, dependency review.  
**Acceptance:** all checks green and no unresolved high/critical finding.  
**Open live proof:** production RLS, Auth, provider and rollback behavior.

### G6 — API, data and workflow contracts

**Owner:** Codex/backend.  
**Files:** API routes, Zod schemas, migrations, workflow contracts, contract tests.  
**Deliverables:** auth matrix, status transitions, error codes, idempotency key
rules, checkpoint schema, audit schema, timeout and rollback semantics.  
**Acceptance:** invalid input, duplicate request, timeout and unauthorized request
have deterministic results.

### G7 — Auth, tenant isolation and storage

**Owner:** Supabase + Codex.  
**Files:** `supabase/migrations/`, `src/lib/auth/`, `tests/security/`, acceptance runner.  
**Runtime cases:** user A login, user B login, two tenants, own-data reads,
cross-tenant read/write rejection, logout, expired token, storage boundary.  
**Expected rejection:** `401`, `403` or safe `404`, never data leakage.  
**Acceptance:** redacted A/B evidence with tenant IDs hashed or omitted.  
**Current state:** `BLOCKED` until approved test credentials exist.

### G8 — Durable execution

**Owner:** Inngest + Codex.  
**Files:** `src/inngest/`, `src/server/services/checkpoint.service.ts`,
`src/server/services/audit-service.ts`, workflow acceptance runner.  
**Runtime cases:** sync app, trigger task, worker execution, checkpoint, audit,
retry, duplicate event, timeout, failure transition, recovery and rollback.  
**Acceptance:** one successful run and one controlled failure have correlated,
redacted task/checkpoint/audit evidence.  
**Current state:** `BLOCKED` until workflow ID/runtime credential exists.

### G9 — Providers, cost and observability

**Owner:** Codex + OpenAI/Anthropic/observability owners.  
**Files:** provider adapters, router, cost ledger, Sentry/Langfuse/PostHog adapters.  
**Runtime matrix:** local available, local unavailable, local timeout, cloud
fallback, missing cloud credential, invalid provider response.  
**Evidence:** provider/model name, route `LOCAL`/`CLOUD`, latency, token count,
cost and fallback reason; never prompt, PII or key.  
**Acceptance:** real provider call is redacted and cost/audit records reconcile.  
**Current state:** `BLOCKED` for real runtime proof.

### G10 — Pilot and measurable benefit

**Owner:** product/pilot owner.  
**Deliverables:** two real scenarios, baseline/post-pilot measurements, success
rate, error rate, time saved, cost impact, user outcome and acceptance decision.  
**KPI fields:** definition, source, query, baseline, target, owner, frequency,
alarm threshold and last measurement.  
**Acceptance:** benefit is measured against baseline, not described qualitatively.

### G11 — Technical publication, legal, sales and support

**Owner:** owner/operations/legal.  
**Deliverables:** release checklist, terms, privacy/data policy, licenses, domain,
backup/restore, incident response, support runbook, monitoring handoff, internal
use or sales decision, Stripe sandbox evidence.  
**Acceptance:** a named operator can deploy, monitor, restore and roll back.

### G12 — Operating and customer acceptance

**Owner:** owner/customer/operations.  
**Deliverables:** signed acceptance, runbook handover, rollback rehearsal, backup
restore proof, support/alert ownership, finance reconciliation, open-risk decision.  
**Acceptance:** all critical blocks are `VERIFIED` or have an explicitly approved
`NOT_APPLICABLE` record with owner and date.  
**Rule:** G12 cannot close from documentation or health checks alone.

## 4. Technical acceptance commands

```powershell
npm run lint
npm run typecheck
npm run test -- --run
npm run build
npm run verify
npm audit --audit-level=high
npm run acceptance:production
```

The production runner must be executed only with approved credentials already
present in the approved secret source. It must fail closed with
`credential_not_configured` when they are absent.

## 5. Integration evidence requirements

| Integration | Required evidence | Current rule |
|---|---|---|
| Supabase | Auth login, tenant isolation, RLS negative test, migration state | no secret in evidence |
| Vercel | deployment URL, health, readiness, environment presence without values | no value disclosure |
| Inngest | sync, trigger, worker, checkpoint, retry, audit | no workflow secret disclosure |
| OpenAI | redacted successful call, usage and cost | server-side only |
| Anthropic | redacted successful call, usage and cost | server-side only |
| Stripe | sandbox webhook and ledger reconciliation | no live payment |
| PostHog | redacted event delivery | no customer PII |
| Sentry/Langfuse | error/trace correlation and alert | no prompt or secret logging |

## 6. Issue and PR reconciliation

For every open issue/PR:

- classify as canonical, duplicate, stale, blocked or unrelated;
- choose one canonical issue per task;
- link duplicate issues instead of copying work;
- rebase stale package branches from current `main` or close with reason;
- never count a draft PR as completed work;
- record issue, branch, PR, commit, CI and evidence in the master table.

## 7. Final acceptance decision

`ACCEPT` requires all of the following:

- G0–G4 approved;
- G5–G9 technically verified;
- two pilot outcomes recorded;
- finance/KPI records complete;
- G10 publication decision recorded;
- G11 legal/support/release readiness recorded;
- G12 operating acceptance signed;
- main CI and production health still green after the final merge.

Until then the only valid result is `PARTIAL`, `BLOCKED` or `REJECTED`.

## 8. Current execution record

- **Completed:** PR #88, #89, #90 and #91; CI/CodeQL/health/readiness; local lint,
  typecheck, 276 tests and build.
- **Active:** production acceptance evidence collection.
- **Latest evidence:** `docs/evidence/production-acceptance-2026-10-01.md`.
- **Blocked:** Auth/RLS, tenant isolation, Inngest, real provider, pilot, finance,
  KPI and G10–G12 evidence.
- **Next action:** create the smoke-evidence PR, then run G7 with approved test
  accounts and continue in dependency order.
- **Completion:** technical merge queue 100%; live acceptance 0/4; overall
  `PARTIAL — NOT PRODUCTION-READY`.
