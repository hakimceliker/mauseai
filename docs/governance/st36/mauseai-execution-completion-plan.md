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

### P0 technical control — Auth, tenant isolation and storage (supports G7/G8)

**Owner:** Supabase + Codex.  
**Files:** `supabase/migrations/`, `src/lib/auth/`, `tests/security/`, acceptance runner.  
**Runtime cases:** user A login, user B login, two tenants, own-data reads,
cross-tenant read/write rejection, logout, expired token, storage boundary.  
**Expected rejection:** `401`, `403` or safe `404`, never data leakage.  
**Acceptance:** redacted A/B evidence with tenant IDs hashed or omitted.  
**Current state:** `BLOCKED` until approved test credentials exist.

### P0 technical control — Durable execution (supports G7/G8)

**Owner:** Inngest + Codex.  
**Files:** `src/inngest/`, `src/server/services/checkpoint.service.ts`,
`src/server/services/audit-service.ts`, workflow acceptance runner.  
**Runtime cases:** sync app, trigger task, worker execution, checkpoint, audit,
retry, duplicate event, timeout, failure transition, recovery and rollback.  
**Acceptance:** one successful run and one controlled failure have correlated,
redacted task/checkpoint/audit evidence.  
**Current state:** `BLOCKED` until workflow ID/runtime credential exists.

### P0 technical control — Providers, cost and observability (supports G7/G8)

**Owner:** Codex + OpenAI/Anthropic/observability owners.  
**Files:** provider adapters, router, cost ledger, Sentry/Langfuse/PostHog adapters.  
**Runtime matrix:** local available, local unavailable, local timeout, cloud
fallback, missing cloud credential, invalid provider response.  
**Evidence:** provider/model name, route `LOCAL`/`CLOUD`, latency, token count,
cost and fallback reason; never prompt, PII or key.  
**Acceptance:** real provider call is redacted and cost/audit records reconcile.  
For Local AI, use only an approved private tunnel/VPN/gateway; never expose
Ollama `11434`. In isolated staging, verify Local → existing cloud fallback →
Local recovery. Preserve the existing cloud provider and credentials.
**Current state:** `BLOCKED` for real runtime proof; the gateway URL and
runtime settings are not present in this worktree.

### P2/P3/P7 — Pilot and measurable benefit (supports G9)

**Owner:** product/pilot owner.  
**Deliverables:** two real scenarios, baseline/post-pilot measurements, success
rate, error rate, time saved, cost impact, user outcome and acceptance decision.  
**KPI fields:** definition, source, query, baseline, target, owner, frequency,
alarm threshold and last measurement.  
**Acceptance:** benefit is measured against baseline, not described qualitatively.

### P8 — Release, legal, sales and support (supports separate G10/G11/G12 decisions)

**Owner:** owner/operations/legal.  
**Deliverables:** release checklist, terms, privacy/data policy, licenses, domain,
backup/restore, incident response, support runbook, monitoring handoff, internal
use or sales decision, Stripe sandbox evidence.  
**Acceptance:** technical publication is a separate G10 decision; sale or
authorized internal use is a separate G11 decision; legal/support/release
readiness supplies evidence but does not itself pass either gate.

### G12 — Sustainable operation

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
| Local AI gateway | `provider=local`, `route=LOCAL`, returned `qwen3:8b`; staged cloud fallback and Local recovery | private endpoint in approved secret store only; never expose `11434` or print URL |
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

- G0–G8 accepted with version/environment-bound evidence;
- G9 pilot completed with the required pilot evidence and pre-pilot controls;
- P4 verifier, authorization, duplicate-effect, recovery and rollback controls
  verified before P2/P3 pilots;
- G10 technical publication/rollback decision recorded after G0–G9;
- G11 sale or authorized internal-use decision recorded separately;
- G12 sustainable-operation acceptance signed separately;
- finance/KPI, legal/support, recovery and operating evidence accepted by their
  named owners;
- main CI and production health still green after the final merge.

Until then the only valid result is `PARTIAL`, `BLOCKED` or `REJECTED`.

## 8. Current execution record

- **Completed implementation increments:** PR #88, #89, #90, #91, #93, #94 and #96 are recorded in the main history; these are not G-gate acceptance.
- **Active:** P0 runtime acceptance evidence collection; P0–P9 packages and G0–G12 gates are tracked separately.
- **Latest evidence:** `docs/evidence/production-acceptance-2026-10-01.md`.
- **Blocked/NOT_RUN:** Auth/RLS, tenant isolation, Inngest, real cloud and local
  provider calls, P4 verifier/recovery, pilots, finance/KPI and G10–G12.
- **Next action:** establish approved test accounts/workflow IDs and private
  gateway access through authorized runtime configuration; run only isolated
  staging tests, then update the evidence register.
- **Completion:** no live acceptance claim; overall
  `PARTIAL — NOT PRODUCTION-READY`.
