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

## GitHub evidence snapshot

Retrieved at **2026-10-01T20:53:04Z**. CI results are bound to the commit SHA
shown in each row. This is a dated snapshot; new commits require fresh checks.

| Type | Link / ID | Commit or ref | CI/review/deployment result | Evidence | Retrieved (UTC) |
|---|---|---|---|---|---|
| Main / PR #96 | [PR #96](https://github.com/hakimceliker/mauseai/pull/96) | Merge commit `04256ac21a1c95da957fab501fc87c7acdf4cdd2` | Merged `2026-10-01T19:32:43Z`; main checks passed | [Main CI run 36915074789](https://github.com/hakimceliker/mauseai/actions/runs/36915074789), [CodeQL run 36915074754](https://github.com/hakimceliker/mauseai/actions/runs/36915074754) | `2026-10-01T20:53:04Z` |
| PR #92 | [PR #92](https://github.com/hakimceliker/mauseai/pull/92) | `codex/mauseai-local-ai-security-20261001` @ `7c8d2fbe23548ffdd26060a9f9114e7a8efb30d9` | Open, ready for review; checks pass; no reviews; `REVIEW_REQUIRED` | [CI run 36916795522](https://github.com/hakimceliker/mauseai/actions/runs/36916795522), [CodeQL run 36916795401](https://github.com/hakimceliker/mauseai/actions/runs/36916795401) | `2026-10-01T20:53:04Z` |
| PR #95 | [PR #95](https://github.com/hakimceliker/mauseai/pull/95) | `chore/windows-acceptance-wrapper` @ `2fe1b005e010f69d371f54c32c7497bd32cba769` | Open; checks pass; no reviews; `REVIEW_REQUIRED` | [CI run 36918029643](https://github.com/hakimceliker/mauseai/actions/runs/36918029643), [CodeQL run 36918029766](https://github.com/hakimceliker/mauseai/actions/runs/36918029766) | `2026-10-01T20:53:04Z` |
| PR #97 | [PR #97](https://github.com/hakimceliker/mauseai/pull/97) | `hakimceliker-mouseai-kanun-uyarlamasi` @ `7e82276967aa6ed2a849f414a98e971098cf7558` | Open; checks pass; no reviews; `REVIEW_REQUIRED` | [CI run 36923624060](https://github.com/hakimceliker/mauseai/actions/runs/36923624060), [Analyze/CodeQL run 36923624193](https://github.com/hakimceliker/mauseai/actions/runs/36923624193), [CodeQL check](https://github.com/hakimceliker/mauseai/runs/110575831794) | `2026-10-01T20:53:04Z` |
| Production deployment | [Deployment 6793405140](https://github.com/hakimceliker/mauseai/deployments) | SHA `04256ac21a1c95da957fab501fc87c7acdf4cdd2` = current main | `success`; exact main SHA match | [Deployment status API](https://api.github.com/repos/hakimceliker/mauseai/deployments/6793405140/statuses) | `2026-10-01T20:53:04Z` |
| Branch protection | [Ruleset 24329825](https://api.github.com/repos/hakimceliker/mauseai/rulesets/24329825) | `main-protection`, `refs/heads/main` | Active; strict checks, PR required, no bypass actors; legacy protection API also active | [Branch protection API](https://api.github.com/repos/hakimceliker/mauseai/branches/main/protection); settings UI `Unauthorized` remains unresolved | `2026-10-01T20:53:04Z` |
| Issues / task cards | [Issues #53–#63](https://github.com/hakimceliker/mauseai/issues) | 11 open; historical #42–#52 closed | Open issues assigned to project owner/milestone; no issue changes made. GitHub Projects returned zero boards; 52-row CSV work view has 2 evidenced links and 50 pending | [Issue/PR inventory](../governance/st36/ISSUE_PR_HYGIENE.md); [52-row task CSV](../governance/st36/MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv) | `2026-10-01T20:53:04Z` |

PR #97 results in this table apply only to the exact head shown. Its checks must
be refreshed after later commits. Neither #92 nor #97 is to be merged without
independent maintainer review.

## Evidence handling

- Record commit SHA, environment, timestamp, exact check/run IDs, status, and
  redacted output for every new proof.
- Keep secrets, tokens, private endpoints, user data, and customer payloads out
  of this repository and report.
- Preserve failed, blocked, and not-run results; do not replace them with a
  later summary that omits the original outcome.
