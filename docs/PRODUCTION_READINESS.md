# MauseAI readiness and deployment checklist

Updated: 2026-10-03. Scope: PR #114 integration branch, not deployed main.
This document consolidates the useful deployment/checklist content of PRs #112
and #113. Passing build/preview gates does not establish production readiness.

## Evidence and scope

The pre-consolidation head `06017c42192ed2055d2d98975152902654fb78c6`
has successful [CI run 37101657547](https://github.com/hakimceliker/mauseai/actions/runs/37101657547)
and [CodeQL run 37101657862](https://github.com/hakimceliker/mauseai/actions/runs/37101657862).
Its recorded test result is **301 passed / 16 skipped**, with **npm audit: 0
vulnerabilities**. These are dated results for that head, not guarantees for
future commits. Every updated head must receive its own successful checks.
The superseded 266+ test count and 12-vulnerability claim are removed.

## Automated checks

| Gate | Implementation | What it proves |
| --- | --- | --- |
| Quality | `.github/workflows/ci.yml`: lint, typecheck, Vitest, build | Source quality and production build |
| Dependency audit | `npm audit --audit-level=high` | No reported high/critical dependency findings; inspect full audit for lower severities |
| Secret scan | `gitleaks/gitleaks-action@v2`, full history | Scan result; does not configure runtime secrets |
| Container | `docker build`, no registry push | Container builds |
| Health check | `scripts/ci-health-check.mjs` against local production build | Missing database credentials fail closed with validated JSON/HTTP 503 |
| CodeQL | `.github/workflows/codeql.yml` | Static analysis and uploaded scanning results |
| Vercel preview | Commit status on the exact PR head | Preview deployment build status; separate from authenticated acceptance |

CI defines jobs; repository branch protection enforcement must be verified
separately. No coverage percentage, production credential state, or production
E2E success is inferred from these jobs.

## Actual health contract

- `GET /api/health`: HTTP 200 for `healthy`; HTTP 503 for `degraded` or
  `unhealthy`. Includes `database` and `integrations`, not a `credentials` map.
- With missing database runtime variables, `database.status` is `not_configured`
  and `database.code` is `credential_not_configured`.
- `GET /api/health/ready`: HTTP 200 with `{ "ready": true }` only after a
  successful database query; otherwise HTTP 503 with `{ "ready": false }`.
- `HEAD /api/health/ready`: same readiness status, empty body.
- Readiness queries the `tenants` table. It does **not** verify Inngest delivery,
  AI inference, payment execution, or a browser Realtime connection.

The CI health gate deliberately omits database credentials and checks the
expected failure response. A 503 here is a passing fail-closed test, **not** a
healthy production instance. No fixed sleep or substring-only JSON check is used.

## Runtime configuration checklist

Store values in the deployment platform's secret settings; never commit them.
No production configuration is claimed to have been inspected by this document.

| Capability | Configuration / evidence required |
| --- | --- |
| Database and server tenant access | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; deployed schema/RLS and successful queries |
| Browser authentication / Realtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; verified login and tenant isolation |
| Task delivery | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`; webhook registration and completed test task |
| AI | Explicit provider selection and its environment credentials; mock output is not real inference evidence |
| Payments | Default `PAYMENT_PROVIDER_TYPE=mock`; sandbox integrations use `PAYMENT_API_KEY` and applicable webhook configuration |

Server-side Supabase aliases are resolved in `src/lib/supabase/env.ts`;
browser authentication still needs the public variables. Missing configuration
must stay visible as an unpassed acceptance gate. Keep payments mock/sandbox
and all financial tests non-production.

## Preview acceptance and remaining blockers

1. Require CI, CodeQL, and Vercel success for the **new exact head**.
2. On an authorized test deployment, set `SMOKE_BASE_URL` and run
   `npm run smoke:production`. Despite its historical name, this script can
   target a preview. Without a bearer token, authenticated task checks are skipped.
   Writes require explicit `SMOKE_CREATE_TASK=1` and `SMOKE_WORKFLOW_ID`.
3. Full `npm run acceptance:production` requires two test users from distinct
   tenants (`SMOKE_USER_A_TOKEN`, `SMOKE_USER_B_TOKEN`) and a test workflow.
   It **creates a task** when configured; use only an authorized test environment.
4. Record HTTP health/readiness, auth, tenant isolation, worker completion,
   checkpoint, and provider results. Skipped/unconfigured gates remain gaps.

A preview build alone does not close these runtime acceptance blockers. Neither
production credential readiness nor full real-service acceptance is established
by this consolidation. See [smoke runbook](production-smoke-runbook.md) and
[acceptance distribution](production-acceptance-task-distribution.md).

## Release and rollback

Main merge, production deploy, DNS, secret changes, and live payments require
separate explicit authorization. This change performs none of them.
Before an authorized release, retain the last known-good deployment identifier
and database migration recovery plan. Roll back application changes through a
reviewed revert PR or an explicitly approved platform rollback. Application
rollback does not undo database changes or external events. Never push a revert
directly to main as part of this checklist.
