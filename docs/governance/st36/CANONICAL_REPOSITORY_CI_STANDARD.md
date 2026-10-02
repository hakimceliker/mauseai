# MouseAI — Canonical Repository and CI Standard

**Status:** `IN_PROGRESS — POLICY DOCUMENTED, ACCESS/PIPELINE VERIFICATION PENDING`

## Repository roles

| System | Role | Rule |
|---|---|---|
| GitLab | Canonical primary repository | Source of truth for code, issues, merge requests and primary CI |
| GitHub | Mirror/backup | Readable mirror and secondary review/evidence surface; not a competing source of truth |
| Forgejo v15.0.9 LTS on the private Windows/Docker server | Private backup/staging and local CI | No public exposure; access and retention remain administrator-controlled |
| Codeberg | Conditional public mirror | Use only when the project is appropriate and platform policy permits it |

## Change flow

1. Work starts from the canonical GitLab repository and a dedicated branch.
2. Local tests and the private Forgejo CI run before publishing a mirror update.
3. The GitHub mirror is updated from the same commit and must retain commit/branch identity.
4. Evidence records link the canonical commit, mirror ref, CI run, deployment state and acceptance gate.
5. Merge, production deployment and live commands remain disabled by default until explicitly approved and independently reviewed.

## Safety rules

- Never treat GitHub and GitLab as independent sources of truth.
- Never push directly to a protected main/default branch.
- Never copy secrets, customer data, private keys or live command payloads into any mirror or CI log.
- Production deployment is opt-in; staging/backup is not production.
- Crypto, financial execution or platform-restricted content must not be mirrored to Codeberg or any unsuitable public service.
- A green mirror CI run cannot by itself prove live production acceptance.

## Required evidence

Each change must record:

- canonical GitLab project and branch,
- canonical commit SHA,
- GitHub mirror ref and synchronization result,
- Forgejo job and artifact result,
- test/security summary,
- deployment state (`DISABLED`, `STAGING`, or `PRODUCTION`),
- owner, timestamp and rollback path.

## Current acceptance state

This policy document does not claim that GitLab, GitHub mirror or Forgejo connectivity is live and verified. Those connections require account URLs, credentials/configuration and a controlled non-production synchronization test. Until that evidence exists, the repository-control gate remains `BLOCKED`/`NOT_RUN`.

## Rollback

Stop mirror synchronization, preserve the canonical GitLab commit, and revert only the affected staging/mirror ref. Do not delete the canonical source or alter production data.
