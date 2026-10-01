# MouseAI evidence index

- **Last refreshed:** 2026-10-01
- **Current `main`:** `04256ac21a1c95da957fab501fc87c7acdf4cdd2`
- **Overall:** `PARTIAL — NOT PRODUCTION-READY`

This index distinguishes repository/CI evidence from live integration,
customer, finance, and operational acceptance. A passing mock, health check,
source hash, or document is not a substitute for its required acceptance gate.

| Evidence | What it proves | What it does not prove |
|---|---|---|
| [Production smoke/acceptance snapshot](production-acceptance-2026-10-01.md) | A dated prior smoke run and its explicit credential blockers | Tenant isolation, real provider calls, workflow execution, pilot benefit |
| [Integration evidence register](../governance/st36/INTEGRATION_EVIDENCE.md) | Current PR/main/deployment status and redacted health response | Live Auth/RLS, Inngest or real integration acceptance |
| [Final acceptance matrix](../governance/st36/FINAL_ACCEPTANCE.md) | Gate-by-gate status and evidence boundary | A passed G0–G12 gate |
| [Pilot, KPI, finance and release register](../governance/st36/PILOT_KPI_FINANCE_RELEASE.md) | Required evidence fields and unresolved data/decision statuses | Pilot, revenue, cost, KPI or restore results |
| [Source hash/change record](../governance/st36/SOURCE_REGISTER_AND_CHANGE_RECORD.md) | Supplied source hashes, versions, repo counterparts and mismatches | Semantic approval of conflicting source versions |
| [Issue/PR hygiene inventory](../governance/st36/ISSUE_PR_HYGIENE.md) | Live issue/PR inventory, stale/diverged branches and review blockers | Authorization to assign, close, rebase or merge |
| [Repository control record](../governance/st36/REPOSITORY_CONTROL_RECORD.md) | Verified main branch protection, CI contexts, Actions permissions and deployment SHA | Independent human approval or production acceptance |

## Current pull-request evidence

The following PRs were checked live on 2026-10-01. Their required CI, CodeQL,
secret-scan, dependency-audit, Docker, and Vercel checks passed; none has an
independent maintainer review, so none is accepted or merge-ready.

| PR | Branch | CI/review |
|---|---|---|
| [#92](https://github.com/hakimceliker/mauseai/pull/92) | `codex/mauseai-local-ai-security-20261001` | Required checks pass; `REVIEW_REQUIRED`; no reviews |
| [#95](https://github.com/hakimceliker/mauseai/pull/95) | `chore/windows-acceptance-wrapper` | Required checks pass; `REVIEW_REQUIRED`; no reviews |
| [#97](https://github.com/hakimceliker/mauseai/pull/97) | `hakimceliker-mouseai-kanun-uyarlamasi` | Required checks pass; `REVIEW_REQUIRED`; no reviews |

## Evidence handling

- Record commit SHA, environment, timestamp, exact check/run IDs, status, and
  redacted output for every new proof.
- Keep secrets, tokens, private endpoints, user data, and customer payloads out
  of this repository and report.
- Preserve failed, blocked, and not-run results; do not replace them with a
  later summary that omits the original outcome.
