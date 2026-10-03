# MouseAI — G0 Repository ve Branch Kontrol Kaydı

- **Last checked (UTC):** 2026-10-01T20:53:04Z
- **Repository:** `hakimceliker/mauseai`
- **Default branch:** `main`
- **Main SHA:** `04256ac21a1c95da957fab501fc87c7acdf4cdd2`
- **Current change branch:** `hakimceliker-mouseai-kanun-uyarlamasi`
- **Overall product status:** `PARTIAL — NOT PRODUCTION-READY`

## Verified repository controls

| Control | Live state | Evidence / result |
|---|---|---|
| Main direct push | Protected by required pull request | Branch protection GET below |
| Pull request review | At least 1 approval; approval from latest push required; stale reviews dismissed; admins included | GitHub API protection response |
| Required checks | Strict, current main required; see exact list below | All contexts observed passing on PR #92/#95/#97 |
| Force push / branch deletion | Disabled | GitHub API protection response |
| Conversation resolution | Required | GitHub API protection response |
| Actions default token permission | `read` | `GET /repos/hakimceliker/mauseai/actions/permissions/workflow` |
| Actions can approve PR reviews | `false` | Same endpoint |
| Allowed Actions | `all` | `GET /repos/hakimceliker/mauseai/actions/permissions`; not narrowed |
| SHA-pinned action requirement | `false` | Same endpoint; recommendation remains open |
| Secret scanning / push protection | Enabled | Repository security-and-analysis API |
| Non-provider secret patterns | Disabled | Repository security-and-analysis API |
| Dependabot security updates | Enabled | Repository security-and-analysis API |
| Fork PR workflow events | `pull_request`; no `pull_request_target` found | `.github/workflows/ci.yml`, `codeql.yml` |

### Main branch protection

Verified by `GET /repos/hakimceliker/mauseai/branches/main/protection` and
`GET /repos/hakimceliker/mauseai/rulesets/24329825` at
`2026-10-01T20:53:04Z` (`gh api`; [ruleset API](https://api.github.com/repos/hakimceliker/mauseai/rulesets/24329825),
[branch-protection API](https://api.github.com/repos/hakimceliker/mauseai/branches/main/protection)).
The
branch-protection API itself has no numeric ruleset ID; the separate active
repository ruleset is `main-protection`, ID `24329825`, enforcement `active`,
target `refs/heads/main`, with no bypass actors. The ruleset API reports
`created_at=2026-10-01T22:45:19.689+03:00` and
`updated_at=2026-10-01T23:23:03.942+03:00`. The branch-protection GET is
verified separately; the two controls are not conflated.

The repository-settings UI previously showed `Unauthorized`; the direct API
GETs above succeeded with the current CLI identity and confirm protection is
active. The UI authorization discrepancy remains unresolved and is not
evidence that protection is absent. No duplicate ruleset was created or
settings changed during this recheck.

Required strict status contexts:

```text
quality
dependency-audit
secret-scan
docker
Analyze (javascript-typescript)
CodeQL
Vercel
Vercel Preview Comments
```

These live context names map to actual workflow checks as follows; no
non-existent context was added:

| Required context | Actual check |
|---|---|
| `quality` | CI job running `npm run lint`, `npm run typecheck`, `npm test -- --run`, and `npm run build` |
| `dependency-audit` | CI job running `npm audit --audit-level=high` |
| `secret-scan` | Gitleaks workflow job |
| `docker` | CI job running `docker build` |
| `Analyze (javascript-typescript)` | CodeQL workflow matrix analysis job |
| `CodeQL` | GitHub CodeQL analysis check |
| `Vercel` | Vercel preview deployment check |
| `Vercel Preview Comments` | Vercel preview comment check |

The contexts were observed live on PR #92, #95 and #97; all were successful at
the recorded snapshot time. Protection also requires one approval, approval of
the latest push, dismissal of stale reviews, admin enforcement, no force-push
or deletion, and resolved review conversations.

**Transparent setting history:** the first read of the legacy branch-protection
endpoint returned `404 Branch not protected`; at that point a separate
rulesets query had not yet been made, so no claim is made that the main ruleset
was absent. During this work the legacy branch protection was briefly enabled,
removed after an interim verify-only instruction, then re-enabled after the
user's explicit final instruction. A later rulesets read found the active
`main-protection` ruleset above. Final direct GETs verify both controls. The earlier branch-protection response was
read at `2026-10-01T20:33:47Z` (GitHub request
`CDD6:2D57A3:145F0C6:1456C0B:6ABEC3AB`); ruleset ID `24329825` was read at
`2026-10-01T20:33:49Z` (request
`C366:3D362D:13E9752:13E34B3:6ABEC3AC`). The ruleset requires one approval,
dismisses stale reviews, requires strict checks
`quality`, `CodeQL`, `secret-scan`, `dependency-audit`, `docker`, and `Vercel`,
and blocks non-fast-forward updates/deletion. The legacy branch-protection
response additionally requires latest-push approval, strict contexts
`quality`, `dependency-audit`, `secret-scan`, `docker`,
`Analyze (javascript-typescript)`, `CodeQL`, `Vercel`, and
`Vercel Preview Comments`, admin enforcement, and conversation resolution.
No main code was pushed by this sequence. Re-read both APIs before later
state-dependent claims.

PR #96 merged at `2026-10-01T19:32:43Z`, before this ruleset's reported
creation time (`2026-10-01T19:45:19Z`). The current policy is not retroactive;
its present state does not establish which review policy was effective for
that earlier merge.

### Actions permission boundary

Workflow-level `permissions` is read-only for CI; CodeQL separately requests
`security-events: write` and `actions: read`. `GITHUB_TOKEN` approval of PR
reviews is disabled. Pull-request workflows use `pull_request`, which does not
expose repository secrets to fork PRs; GitHub supplies the restricted
read-only `GITHUB_TOKEN`. Repository Actions allowlist remains `all`, and
SHA-pinning is not required. Those repository-wide controls were verified but
not modified; consider restricting the allowlist to the four Actions actually
used and pinning to verified full commit SHAs in a reviewed follow-up.

## Pull request, CI, and deployment evidence

PR state and checks below were re-read at `2026-10-01T20:53:04Z`. PR #97's
check results apply only to head `7e82276967aa6ed2a849f414a98e971098cf7558`.

| Item | Live result |
|---|---|
| PR #92 | Open, ready for review (`isDraft=false`); required checks pass; no reviews; `REVIEW_REQUIRED` |
| PR #95 | Open on `chore/windows-acceptance-wrapper` to current main; mergeable; required checks pass; no reviews; `REVIEW_REQUIRED` |
| PR #97 | Open on `hakimceliker-mouseai-kanun-uyarlamasi` to current main; head `7e82276967aa6ed2a849f414a98e971098cf7558`; all required checks pass; no reviews; `REVIEW_REQUIRED` |
| PR #96 | Merged at `2026-10-01T19:32:43Z`; merge commit `04256ac21a1c95da957fab501fc87c7acdf4cdd2` is current main; PR and main checks pass |
| Current main CI | `quality`, `dependency-audit`, `secret-scan`, `docker`, `Analyze (javascript-typescript)` and CodeQL pass on `04256ac`; [CI run 36915074789](https://github.com/hakimceliker/mauseai/actions/runs/36915074789), [CodeQL run 36915074754](https://github.com/hakimceliker/mauseai/actions/runs/36915074754) |
| Production deployment | Deployment `6793405140` is `success`, SHA `04256ac21a1c95da957fab501fc87c7acdf4cdd2`, exactly matching current main; [deployment status](https://api.github.com/repos/hakimceliker/mauseai/deployments/6793405140/statuses) |
| Health/readiness | Live HTTP 200 checks; see [integration evidence](INTEGRATION_EVIDENCE.md). Health is not integration acceptance. |

## Safety and rollback

- Never put secret values, private endpoints, or customer data in issues,
  commits, logs, or evidence.
- Do not merge PR #92/#95/#97 before required checks remain green and an
  independent maintainer approval is present.
- Repository changes roll back by reverting the reviewed PR commit. A
  production rollback requires the authorized operator to promote the last
  known-good deployment; this record does not authorize that action.
- Project identity and isolation are verified against the repository remote
  before changes. No unrelated project is modified.
