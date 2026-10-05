# MouseAI — External CI/account status

**Captured:** 2026-10-04 (Europe/Istanbul)

## GitHub

- Canonical repository: `https://github.com/hakimceliker/mauseai`
- Git remote in the MouseAI worktrees: GitHub `origin`
- GitHub remains the source of truth for branches, pull requests, required checks and merge decisions.

## GitLab

- Authenticated account observed: `hakimceliker.ac`
- Display name: `ABDULHAKİM ÇELİKER`
- Group: `senatech-group`
- Group ID: `143812793`
- Visible GitLab project: `senatech-project`
- MouseAI GitLab project/remote: **NOT CONFIGURED**
- GitLab Runner service on the local machine: **NOT FOUND**

The visible GitLab account and group are not treated as a MouseAI mirror or implementation source. No new GitLab project, remote, webhook, runner, token, or permission was created. GitHub remains canonical; Forgejo remains the read-only mirror/backup layer.

## PR #114 reconciliation

- Live state observed: open, `claude/merge-queue-integration` → `main`, 68
  commits, independent approval still required.
- Read-only `git ls-remote` confirmed head
  `39a097b6ac08b13f77d17ecc86b9e1dea5f47d28` and main
  `04256ac21a1c95da957fab501fc87c7acdf4cdd2`.
- The live PR description reports an older verification summary (`301 passed /
  16 skipped`, commit `06017c4`).
- The current local worktree verification reports `336 passed / 16 skipped`;
  these results are not yet present on GitHub and must not be represented as
  GitHub CI evidence.
- The local worktree is `chore/g10-pilot-finance-reconcile` at
  `d9632b3ec984147959f9de7c69c0bcce9e225b9e` with 62 changed/uncommitted
  paths; it is not the PR #114 head.
- This is recorded as an evidence/source synchronization gap. No PR text,
  review, merge, branch, or deployment was changed by this check.

## PR #114 read-only recheck — 2026-10-04T08:30Z

- GitHub still reports PR #114 as `OPEN`, targeting `main` from
  `claude/merge-queue-integration`, with 68 commits.
- The checks page lists Vercel, Vercel Preview Comments, CodeQL/Analyze, CI,
  quality, dependency-audit, secret-scan, docker, and health-check contexts.
- No independent maintainer approval or merge result was recorded in the
  current read-only page snapshot.
- The PR description still contains the older `301 passed / 16 skipped`
  summary; the newer local `336 passed / 16 skipped` result remains local
  evidence only.

## Safe next action

If an authorised MouseAI GitLab project is later provided, it may be registered as a secondary read-only evidence/CI destination. Until then, no GitLab-side status is inferred for MouseAI and no external write is performed.
