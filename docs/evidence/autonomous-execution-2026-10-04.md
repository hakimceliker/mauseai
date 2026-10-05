# Autonomous execution evidence — 2026-10-04

## Scope

This record covers the autonomous local verification pass for the current
working copy. It does not claim a GitHub merge, production deployment, live
provider acceptance, pilot acceptance, or operating acceptance.

## Canonical execution context

| Field | Value |
|---|---|
| Repository | `hakimceliker/mauseai` |
| Branch | `chore/g10-pilot-finance-reconcile` |
| HEAD | `d9632b3` |
| Source of truth | GitHub |
| Secondary layers | GitLab CI/private pipeline; Forgejo read-only mirror/DR/local CI |
| Local runtime | Windows + Node/npm; Docker services remain separately tracked |
| Acceptance state | `PARTIAL — NOT PRODUCTION-READY` |

## Executed checks

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 31 files, 276 passed, 16 skipped |
| `npm run build` | PASS — Next.js production build and route generation completed |

## Evidence Gate implementation pass

The first safe runtime increment from the LETFON acceptance model was added:

- `src/core/evidence/evidence-gate.ts`
- `src/__tests__/evidence-gate.test.ts`

The pure gate evaluator is fail-closed and requires branch/SHA verification,
required CI, tests, evidence completeness, independent review, Judge,
dependency verification, and human approval when the action requires it. It
returns `CLOSED`, `REVIEW`, or `BLOCKED` and lists missing conditions.

The full verification was re-run after the change:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 32 files, 280 passed, 16 skipped |
| `npm run build` | PASS |

## Live GitHub evidence recheck

Read-only inspection of PR #108 confirmed that the evidence-register change is
still open and awaits an approving review. The branch has no deployment, and
Vercel reported a daily deployment quota block. Copilot listed four unresolved
documentation recommendations: preserve canonical task/gate IDs, require
deployment URL or ID and deployed commit, map source statuses to canonical
states, and resolve competing G0–G12 taxonomies. These findings remain
`REVIEW`/infrastructure-blocked evidence and were not promoted to acceptance.

## Work lifecycle implementation pass

The canonical acceptance lifecycle was added without replacing the existing
application task statuses:

- `src/core/status/work-lifecycle.ts`
- `src/__tests__/work-lifecycle.test.ts`

The validator permits recovery from `BLOCKED`, rejects skipping acceptance
states, and refuses `CLOSED` unless the evidence gate has passed.

Final verification after both safe increments:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 33 files, 284 passed, 16 skipped |
| `npm run build` | PASS |

## Permission Engine implementation pass

The fail-closed permission boundary was added:

- `src/core/permissions/permission-engine.ts`
- `src/__tests__/permission-engine.test.ts`

The evaluator denies missing identity, cross-tenant access, and non-allowlisted
tools. L3/L4 or explicitly marked high-risk operations return
`REQUIRES_HUMAN_APPROVAL` until approval is present. It does not execute tools
or modify production state.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 34 files, 288 passed, 16 skipped |
| `npm run build` | PASS |

## Cost Controller service integration pass

`src/server/services/cost-service.ts` now evaluates the projected cost before
inserting a cost event. Budget overflow is rejected before the event is
persisted, while the decision and utilization are included in the audit
payload. The service returns the cost decision for callers. The integration
uses existing Supabase cost/task records; it does not invent provider costs or
change production data during this pass.

Final verification after this integration:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 41 files, 316 passed, 16 skipped |
| `npm run build` | PASS |

## Cost Controller implementation pass

The budget decision layer was added:

- `src/core/cost/cost-controller.ts`
- `src/__tests__/cost-controller.test.ts`

The controller evaluates projected spend against a task/tenant budget,
produces `ALLOW`, `ALERT`, or `BLOCKED`, preserves an explicit unconfigured
budget state, and rejects invalid negative values. It does not invent real
provider costs; actual cost still comes from provider/cost-event evidence.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 41 files, 316 passed, 16 skipped |
| `npm run build` | PASS |

## Unified Trace implementation pass

The tenant-scoped trace core was added:

- `src/core/audit/trace-manager.ts`
- `src/__tests__/trace-manager.test.ts`

The trace manager links task, agent, model, tool, handoff, Judge, evidence,
approval and recovery events under one trace ID. It preserves event order,
rejects cross-tenant events, and keeps prior sessions immutable. This is the
in-memory/domain layer; persistence wiring to the existing audit service is
still a separate integration task.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 40 files, 311 passed, 16 skipped |
| `npm run build` | PASS |

## Context Manager implementation pass

The tenant-aware context boundary was added:

- `src/core/context/context-manager.ts`
- `src/__tests__/context-manager.test.ts`

The manager filters by tenant and key allowlist, redacts personal/secret
values by default, enforces a context item budget, and fails closed when no
tenant is supplied.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 39 files, 308 passed, 16 skipped |
| `npm run build` | PASS |

## Conflict Resolver implementation pass

The independent conflict decision layer was added:

- `src/core/conflicts/conflict-resolver.ts`
- `src/__tests__/conflict-resolver.test.ts`

The resolver ranks candidates by evidence, source trust, and acceptance
scores. It selects only a clearly evidence-backed leader; ambiguous or weakly
accepted conflicts are escalated and cannot produce an automatic PASS.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 38 files, 304 passed, 16 skipped |
| `npm run build` | PASS |

## Watchdog implementation pass

The task-health evaluator was added:

- `src/core/watchdog/watchdog.ts`
- `src/__tests__/watchdog.test.ts`

The evaluator distinguishes recent work, stale work, explicitly blocked work,
and escalation. It requeues stale tasks only while retry budget remains and
escalates blocked or exhausted tasks instead of silently retrying forever.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 37 files, 300 passed, 16 skipped |
| `npm run build` | PASS |

## Recovery/Fallback implementation pass

The recovery decision layer was added:

- `src/core/recovery/recovery-engine.ts`
- `src/__tests__/recovery-engine.test.ts`

It classifies validation, authorization, credential, timeout, rate-limit,
provider, tool, data and unknown failures. It selects retry only while budget
remains, uses a fallback provider when available, replans instead of blindly
retrying authorization/data failures, escalates approval-required work, and
ends exhausted recovery as `BLOCKED`.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 36 files, 296 passed, 16 skipped |
| `npm run build` | PASS |

## Human Approval implementation pass

The high-risk action approval decision layer was added:

- `src/core/approval/human-approval.ts`
- `src/__tests__/human-approval.test.ts`

The policy keeps production deploy, DNS, secret, payment, critical merge,
branch deletion, force-push, production data and infrastructure changes pending
until an attributed human approval exists. Rejected and expired requests remain
non-executable. The test clock is explicit so expiration behavior is
deterministic.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 35 files, 291 passed, 16 skipped |
| `npm run build` | PASS |

## Evidence interpretation

The local checks validate the current code and build baseline only. They do not
close G7 Auth/RLS/tenant isolation, G8 Inngest production execution, G9 real
provider/observability calls, G10 pilot/KPI/finance, G11 release/legal/support,
or G12 operating acceptance. Those gates remain `BLOCKED`, `NOT_RUN`, or
`REVIEW` until their required runtime evidence, independent review, Judge, and
human decisions exist.

## Working tree safety

Existing user changes were preserved. No reset, force-push, branch deletion,
merge, production deployment, secret change, DNS change, payment action, or
permission change was performed by this pass.

## Next safe technical action

Keep the local verification result attached to the current branch/SHA, then
prepare the governance/evidence changes for a GitHub PR review. Re-run the
remaining GitHub PR checks when the API/read-only session is available. Do not
promote any gate to `CLOSED` from this local result alone.

## Trace persistence integration pass

The existing audit and worker persistence path now carries a deterministic
task/step trace identifier without requiring a production schema migration:

- `writeAudit` accepts an optional `traceId` and stores it inside the existing
  JSON audit payload.
- `recordCost` propagates the trace identifier into its `cost.recorded` audit
  event while retaining the budget decision and utilization fields.
- The Inngest task worker derives `task:<taskId>:step:<stepId>` once per
  workflow invocation and reuses it for cost, completion, and retry/failure
  audit records.

This preserves tenant-scoped audit correlation across the worker, cost
controller, checkpoint, retry, and failure paths. It is a local code-level
verification only; production Inngest delivery and live audit persistence
remain unverified until valid runtime credentials and independent acceptance
evidence are available.

Final verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 41 files, 316 passed, 16 skipped |
| `npm run build` | PASS |

No merge, deployment, secret, DNS, payment, permission, branch deletion, or
force-push was performed.

## CI Doctor classification pass

The CI Doctor layer was added:

- `src/core/ci/ci-doctor.ts`
- `src/__tests__/ci-doctor.test.ts`

It keeps queued or running jobs `PENDING`, records successful terminal jobs as
`PASS`, classifies a failed run with zero executable steps as
`INFRASTRUCTURE_BLOCKED` with reason `runner_failed_before_steps`, and only
classifies a failure as a code failure after executable work has started. This
prevents a runner outage from being counted as a module regression while
remaining fail-closed for acceptance.

Targeted verification: 1 file, 4 tests passed.

Full verification after this increment:

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 42 files, 320 passed, 16 skipped |
| `npm run build` | PASS |

## Evidence register reconciliation pass

The canonical evidence contract was added at
`docs/governance/st36/EVIDENCE_REGISTER_GATE.md` and linked from the ST3.6
README. It resolves the review findings by defining the authoritative LETFON
G0–G12 taxonomy, immutable gate/task identity, source-to-canonical status
mapping, deployment URL/ID plus deployed SHA requirements, and the independent
review/Judge/human-approval close gate. Legacy labels remain historical aliases
and cannot close a current gate without reconciliation.

This is a documentation and control improvement. It does not change any live
gate to `ACCEPTED` and does not replace the required GitHub review or runtime
evidence.

## Canonical evidence validator pass

Added `scripts/validate-canonical-evidence.mjs` and the `npm run
evidence:validate` command. The validator checks the repository identity,
ordered G0–G12 register, source SHA-256/size fields, acceptance evidence
requirements, and the invariant that `runtime_verified: false` cannot coexist
with a real production-acceptance claim.

Verification: `CANONICAL EVIDENCE: PASS (13 gates, 4 sources)`; lint and
typecheck also passed. The current result remains
`PARTIAL — NOT PRODUCTION-READY`.

The validator is now the first step of `npm run verify`, so future local and CI
verification cannot pass while the canonical evidence register is malformed or
claims production acceptance without runtime verification.

The GitHub `quality` workflow now runs `npm run evidence:validate` and
`npm run evidence:g10` immediately after dependency installation, before lint,
typecheck, tests, and build. G10 structure validation remains distinct from
pilot/KPI/finance acceptance, which stays unresolved. This change is ready for
a PR/CI review; it has not been merged into `main` in this worktree.

## G10 fail-closed validation pass

`node scripts/validate-g10.mjs` returned `G10 STRUCTURE_VALID` and
`G10 ACCEPTANCE: NOT_ACCEPTED_PENDING_PILOT_KPI_FINANCE_EVIDENCE`. The required
pilot, baseline/target KPI measurements and finance evidence remain explicitly
open; structural readiness was not promoted to acceptance.

## Dependency and container verification pass

- `npm audit --audit-level=high`: PASS — 0 vulnerabilities.
- Docker daemon: available (`29.8.0`).
- Local image build `mouseai-ci:local-20261004`: PASS.
- The image was kept local; no registry push or deployment was performed.

## Production acceptance fail-closed evidence pass

`scripts/production-acceptance.mjs` now persists a redacted evidence file even
when `SMOKE_BASE_URL` is missing. A local negative test produced:

```text
configuration: FAIL (credential_not_configured:SMOKE_BASE_URL)
exit=2
```

This preserves the required `BLOCKED` evidence trail without contacting a
runtime or inventing a live acceptance result. Credentials, URLs and response
bodies are not written to the repository.

## Supabase fake-credential fallback removal pass

The repository scan found and removed placeholder Supabase credentials from
`src/lib/db/supabase.ts` and `src/lib/auth/browser-session.ts`. Missing runtime
configuration now produces a null client or an empty unauthenticated header,
while privileged access remains explicitly
`credential_not_configured:SUPABASE_SERVICE_ROLE_KEY`.

Added `src/__tests__/supabase-config.test.ts` covering both fail-closed paths.
The scan has no remaining `mock.supabase.co` or `mock-anon-key` references.

Full verification after this increment:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 43 files, 322 passed, 16 skipped |
| `npm run build` | PASS |

## Production mock-provider boundary pass

Production execution now rejects mock AI routing and implicit/mock payment
configuration. Local and test environments retain explicit mock providers for
deterministic development. Added regression coverage for both boundaries;
production credentials and provider selection remain required for acceptance.

Targeted verification: 2 files, 6 tests passed.

Full verification after this increment:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 44 files, 324 passed, 16 skipped |
| `npm run build` | PASS |

This is a fail-closed code control only. It does not prove live provider,
payment, pilot, or operational acceptance.

## Production observability boundary pass

Production now rejects implicit or console notification and analytics
providers, and requires the configured credentials for PostHog, Mixpanel,
Segment, email, or Slack. Local/test console adapters remain available for
deterministic development. This prevents a health response from treating
console-only integrations as live operational delivery.

Targeted verification: 2 files, 22 tests passed.

Full verification after this increment:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 44 files, 326 passed, 16 skipped |
| `npm run build` | PASS |

This remains code-level readiness only; live integration delivery and
independent acceptance are still open.

## Auth provider decision consistency pass

Route-level decisions now use the same `resolveAuthProvider()` function as the
authentication boundary. When production omits `AUTH_PROVIDER`, all task,
checkpoint, timeline, database and Inngest decisions consistently resolve to
Supabase instead of silently falling back to the local mock path.

Targeted verification: 2 files, 8 tests passed.

Full verification after this increment:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 44 files, 334 passed, 16 skipped |
| `npm run build` | PASS |

## Auth tenant-membership authority pass

Supabase Auth verification no longer accepts a tenant identifier from JWT
metadata as sufficient authorization. After the user token is validated, the
server-side `users.auth_user_id` membership record is required and supplies the
effective tenant. Missing or failed membership lookup fails closed.

Targeted verification: `supabase-auth.test.ts`, 7 tests passed.

Latest full local verification: 44 files, 336 passed, 16 skipped; evidence
validator, lint, typecheck, and production build passed.

## Cost ledger and workflow idempotency pass

The migration chain now defines `public.cost_events` with tenant-scoped RLS,
task/trace uniqueness, token and non-negative cost checks, and supporting
indexes. `recordCost()` uses the deterministic trace key and returns a
duplicate decision without incrementing task spend when a workflow delivery is
replayed.

Targeted verification: migration security and cost-controller tests, 9 tests
passed.

Latest full local verification: 44 files, 336 passed, 16 skipped; evidence
validator, lint, typecheck, and production build passed.

## Supabase Auth network fail-closed pass

Server-side token verification now applies a bounded timeout and returns an
authentication failure on network, timeout, or malformed JSON responses. It
also handles membership lookup failures without leaking provider details or
turning an unavailable Auth service into an internal error response.

Targeted verification: `supabase-auth.test.ts` plus local fallback tests, 10
tests passed.

This is a local boundary test only. Real Supabase Auth, tenant membership,
RLS, logout/expiry, and cross-tenant negative evidence remain required before
G7 can be accepted.

## Local invalid-response fallback pass

The local Ollama/gateway adapter now rejects an empty or whitespace-only
response as `invalid_empty_response`. The router therefore invokes the
configured cloud fallback instead of treating an invalid local result as a
successful task response. Prompt and response contents are not persisted in
the evidence record.

Targeted verification: `local-ai-fallback.test.ts`, 4 tests passed.

This remains a code-level and simulated-provider result. A real tunnel,
Ollama/gateway, cloud credential, token/cost trace, and live fallback run are
still required for G9 acceptance.

## Payment provider configuration fail-closed pass

An unknown `PAYMENT_PROVIDER_TYPE` can no longer fall through to the mock
payment adapter in production. Production now raises
`PAYMENT_PROVIDER_UNSUPPORTED:<value>`; local/test mock and null behavior is
preserved for non-production use.

Targeted verification: 2 files, 25 tests passed.

## AI provider configuration fail-closed pass

An unknown `AI_PROVIDER` value can no longer fall through to the mock provider
in production. Production now raises `AI_PROVIDER_UNSUPPORTED:<value>`;
local/test environments retain the explicit deterministic mock path.

Targeted verification: 2 files, 15 tests passed.

## Supabase admin credential error-contract pass

The server-side Supabase admin client now reports missing URL/service-role
configuration as `credential_not_configured:SUPABASE_SERVICE_ROLE_KEY`, matching
the canonical evidence and runtime diagnostic contract without exposing any
credential value.

Targeted verification: 3 files, 18 tests passed.

## Direct AI router production boundary pass

The direct `AIRouter` constructor now rejects `AI_PROVIDER=mock` in
production, covering worker and service call paths that do not pass through
the higher-level task router. Local/test mock behavior remains unchanged.

Targeted verification: 2 files, 8 tests passed.

This is a code-level guard only; real provider credentials and live provider
evidence remain required for G9 acceptance.

The G10 structural validator is exposed as `npm run evidence:g10`. It returns
the explicit structural result and keeps the acceptance result unresolved:

```text
G10 STRUCTURE_VALID
G10 ACCEPTANCE: NOT_ACCEPTED_PENDING_PILOT_KPI_FINANCE_EVIDENCE
```

## Acceptance evidence URL redaction pass

The production acceptance runner now strips query strings and fragments from
the base URL before persisting an evidence file. Requests still use the
configured runtime URL, but persisted evidence cannot retain accidental URL
credentials or tracking parameters.

## Health provider diagnostic-accuracy pass

The health endpoint now labels unset payment, notification, and analytics
configuration as `not_configured`; it no longer reports `mock` or `console` as
the apparent runtime provider when no production configuration exists. This
prevents diagnostic output from implying a live provider is ready. The change
does not mark any live integration gate as accepted.

Targeted verification: 2 files, 20 tests passed.

Latest full local verification:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 44 files, 334 passed, 16 skipped |
| `npm run build` | PASS |

## Latest incremental boundary verification

The local AI adapter rejects empty output and triggers the configured cloud
fallback. Supabase Auth token verification uses a bounded timeout and fails
closed on network or malformed-response errors.

Targeted verification: 2 files, 10 tests passed.

Latest full local verification remains:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test -- --run` | PASS — 44 files, 334 passed, 16 skipped |
| `npm run build` | PASS |

## Dependency and container verification pass

The current working tree was checked without changing production or pushing an
image:

| Check | Result |
|---|---|
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| Docker daemon | PASS — Docker Desktop 29.8.0 |
| Local Docker image build | PASS — `mouseai-acceptance-local:current`; image ID `sha256:2e23c1fb418fa9d1d39bebfff061585a86e069147991878420ad769ba1e49757`; Dockerfile dependency install and `npm run build` completed |
| Registry push / deployment | NOT_RUN — intentionally excluded from this local evidence pass |

This is local build and dependency evidence only. It does not promote any
G0–G12 gate, production deployment, live provider, pilot, finance, or human
acceptance status.

## Credential-free container smoke — 2026-10-04T08:35:00Z

The locally built image was started as an isolated container with no Supabase,
payment, notification, or analytics credentials. The application reached the
Next.js ready state. `/api/health` returned the expected negative result:

```text
HTTP 503
status: unhealthy
database: not_configured
code: credential_not_configured
missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
realtime: degraded / connected=false
```

The container was removed after the smoke test. This proves startup and
fail-closed diagnostics only; it is not live Auth, RLS, provider, or production
acceptance evidence.

The follow-up readiness smoke returned `HTTP 503` with `{"ready":false}`.
This confirms that an application process being ready does not incorrectly
advertise production readiness when required credentials are absent.

## Fresh full verification — 2026-10-04T08:29:52Z

The complete local `npm run verify` chain was rerun after the evidence-record
reconciliation:

| Check | Result |
|---|---|
| Canonical evidence validator | PASS — 13 gates, 4 sources |
| Lint | PASS |
| Typecheck | PASS |
| Tests | PASS — 44 files, 336 passed, 16 skipped |
| Production build | PASS — routes generated successfully |
| G10 structural validator | STRUCTURE_VALID; acceptance remains pending pilot/KPI/finance evidence |
| Live acceptance | NOT_RUN — credentials and human acceptance remain unavailable |

The evidence validator now also fails closed if the canonical LETFON 01–40 /
G0–G12 contract or the independent review/Judge closure rule is missing. The
updated full verification at `2026-10-04T08:39:49Z` passed this additional
contract check along with the existing lint, typecheck, test and build checks.

The local verification was rerun at `2026-10-04T20:37:22+03:00`. The evidence
validator, lint, typecheck, 44 test files (336 passed, 16 skipped), and
production build passed again. The G10 structural validator remained fail-closed
with pilot/KPI/finance evidence pending; `git diff --check` passed and the high
severity dependency audit found zero vulnerabilities. These results remain
local evidence and do not promote any G0–G12 gate or change merge/deployment
state.

The verification chain was rerun at `2026-10-04T20:52:39+03:00`. Evidence
validation, lint, typecheck, 44 test files (336 passed, 16 skipped), and the
production build passed. The dependency audit reported zero high-severity
vulnerabilities and `git diff --check` passed. G10 remains pending real
pilot/KPI/finance evidence; no live acceptance, merge, deployment, or secret
operation was performed.

The safe production-acceptance runner was invoked without runtime settings.
It failed closed at configuration with `credential_not_configured:SMOKE_BASE_URL`;
no network request, credential access, deployment, or acceptance claim was made.
This confirms the live acceptance gate remains NOT_RUN rather than hiding a
missing environment behind a false PASS.

The canonical register gate statuses were normalized from the legacy
`BEKLEMEDE` label to `NOT_RUN` (2), `PARTIAL` (5), and `BLOCKED` (6).
The validator now rejects non-canonical gate statuses and unknown gate IDs;
the evidence-gate test and canonical validator both pass after normalization.
