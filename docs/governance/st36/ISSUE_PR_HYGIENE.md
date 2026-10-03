# MouseAI GitHub issue and pull-request inventory

- **Last checked (UTC):** 2026-10-01T20:53:04Z
- **Repository:** `hakimceliker/mauseai`
**Rule:** No issue was assigned or closed. PR #96 had already merged before
this snapshot; no PR was merged by this reconciliation.

## Active non-draft pull requests

All three open PRs were live-checked at the timestamp above. Required
CI/security/preview checks passed, but no independent reviews exist.
`REVIEW_REQUIRED` is a merge blocker under the verified main protection.

| PR | Branch | Base | Head | Status | Owner / milestone / next step |
|---|---|---|---|---|---|
| [#92](https://github.com/hakimceliker/mauseai/pull/92) | `codex/mauseai-local-ai-security-20261001` | `04256ac` | `7c8d2fbe23548ffdd26060a9f9114e7a8efb30d9` | `OPEN`, ready for review (`isDraft=false`); all required checks pass | No review; request independent maintainer review |
| [#95](https://github.com/hakimceliker/mauseai/pull/95) | `chore/windows-acceptance-wrapper` | `04256ac` | `2fe1b005e010f69d371f54c32c7497bd32cba769` | `OPEN`; all required checks pass | No review; requested branch PR already exists |
| [#97](https://github.com/hakimceliker/mauseai/pull/97) | `hakimceliker-mouseai-kanun-uyarlamasi` | `04256ac` | `7e82276967aa6ed2a849f414a98e971098cf7558` at snapshot | `OPEN`; all required checks pass at this head | No review; independent maintainer review required before merge |

No new PR was created for `chore/windows-acceptance-wrapper`; #95 is its existing
PR to current `main`.

## Merged baseline

PR [#96](https://github.com/hakimceliker/mauseai/pull/96) merged at
`2026-10-01T19:32:43Z`; merge commit
`04256ac21a1c95da957fab501fc87c7acdf4cdd2` is the current `main` SHA. Its
required PR checks passed, and post-merge main CI run
[36915074789](https://github.com/hakimceliker/mauseai/actions/runs/36915074789)
and CodeQL run
[36915074754](https://github.com/hakimceliker/mauseai/actions/runs/36915074754)
passed. Production deployment `6793405140` is `success` on the same exact SHA.

## Historical draft PRs

The following 11 draft PRs target an older base `9346cdd`, are 85 commits behind
current main, and have 2–4 commits ahead. The live mergeability API reports
PR #71 and #72 as conflicting; others report mergeable but behind. They remain
unmerged, have no assignee/milestone, and are not completion evidence. Their
next step is an authorized owner decision to rebase/reimplement or close; no
destructive action was taken.

| PR | Branch | Live state |
|---|---|---|
| #64 | `feat/MOUSE-001-code-skeleton` | Draft, 2 ahead / 85 behind |
| #65 | `feat/MOUSE-002-arch-review-standard` | Draft, 2 ahead / 85 behind |
| #66 | `feat/MOUSE-005-inngest-workflow` | Draft, 2 ahead / 85 behind |
| #67 | `feat/MOUSE-006-openai-adapter` | Draft, 2 ahead / 85 behind |
| #68 | `feat/MOUSE-007-anthropic-adapter` | Draft, 3 ahead / 85 behind |
| #69 | `feat/MOUSE-008-stripe-sandbox` | Draft, 2 ahead / 85 behind |
| #70 | `feat/MOUSE-009-ui-design-system` | Draft, 2 ahead / 85 behind |
| #71 | `feat/MOUSE-010-error-trace` | Draft, 4 ahead / 85 behind; conflicting |
| #72 | `feat/MOUSE-011-posthog-analytics` | Draft, 2 ahead / 85 behind; conflicting |
| #73 | `feat/MOUSE-003-supabase-migration` | Draft, 2 ahead / 85 behind |
| #74 | `feat/MOUSE-004-vercel-deployment` | Draft, 2 ahead / 85 behind |

No PR was closed or rebased. A project owner must decide whether to rebase,
replace, or close each stale draft.

## Issues and duplicate candidates

Live open issues are #53–#63 (`OPEN`). They are assigned to `hakimceliker` and
belong to milestone `ST3.6 Production Acceptance`; no labels were returned.
Their next step is owner validation that the issue still maps to current package
work and evidence; do not close based on title similarity alone. Historical
issues #42–#52 are closed. Each new MOUSE-001–011 issue has a corresponding
historical title/number family; because the historical items are closed there
are no two open copies in the current live list. This record does not infer
that the newer issue is formally canonical or reopen/close anything.

| Open issue | Historical closed counterpart |
|---|---|
| #53 MOUSE-001 | #42 |
| #54 MOUSE-002 | #43 |
| #55 MOUSE-003 | #44 |
| #56 MOUSE-004 | #45 |
| #57 MOUSE-005 | #46 |
| #58 MOUSE-006 | #47 |
| #59 MOUSE-007 | #48 |
| #60 MOUSE-008 | #49 |
| #61 MOUSE-009 | #50 |
| #62 MOUSE-010 | #51 |
| #63 MOUSE-011 | #52 |

The closed historical issues #42, #43, #45, #49, #50, #51 and #52 currently
carry the `duplicate` label. #44, #46, #47 and #48 do not. All remain closed;
this inventory does not infer additional duplicate relationships or change
their state.

## Acceptance task-card completeness

The 52-row work view is
[`MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv`](MAUSEAI_Eksikler_ve_Kabul_Plani_v1.0.csv).
All PLAN IDs and existing `Durum` values were verified unchanged after adding
branch, PR, commit, CI run, local test result, evidence timestamp and next-step
columns. Only PLAN-003 and PLAN-004 are linked to PR #97 because those links are
directly evidenced. The other 50 rows explicitly remain `NOT_LINKED`,
`NOT_RUN`, or `NOT_RECORDED`; their existing owner-role fields are not treated
as named-person assignments. `gh project list --owner hakimceliker` returned
zero accessible GitHub Projects boards, so no external task cards were
invented or modified.

## Metadata gaps and next action

PR #92/#95/#97 have no assigned reviewer or milestone. The repo contributor
endpoint lists `claude` as a contributor with `read` permission; it does not
establish independent maintainer authority. No reviewer was assigned. Request
an authorized independent maintainer review; do not merge before approval and
all required checks remain green.
