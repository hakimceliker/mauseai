# MouseAI integration evidence register

- **Last verified:** 2026-10-01
- **Verified main:** `04256ac21a1c95da957fab501fc87c7acdf4cdd2`
- **Overall:** `PARTIAL — NOT PRODUCTION-READY`

Only redacted run references and outcomes are retained. No credentials,
customer payloads, or private endpoints are recorded.

## GitHub, deployment, and health

| Item | Result | Evidence and boundary |
|---|---|---|
| Main CI | `VERIFIED` | Current main SHA `04256ac21a1c95da957fab501fc87c7acdf4cdd2`: [CI run 36915074789](https://github.com/hakimceliker/mauseai/actions/runs/36915074789) and [CodeQL run 36915074754](https://github.com/hakimceliker/mauseai/actions/runs/36915074754) succeeded; `quality`, `dependency-audit`, `secret-scan`, `docker`, `Analyze (javascript-typescript)`, and CodeQL completed successfully. |
| PR #92 | `PARTIAL` | Required checks including CodeQL, Vercel, and Vercel Preview Comments passed; branch is mergeable, but no reviews and `REVIEW_REQUIRED`. |
| PR #95 | `PARTIAL` | `chore/windows-acceptance-wrapper` already has the requested open PR to `main`; required checks including CodeQL, Vercel, and Vercel Preview Comments passed; no reviews and `REVIEW_REQUIRED`. |
| PR #97 | `PARTIAL` | Current governance/source/local-AI changes; required checks including CodeQL, Vercel, and Vercel Preview Comments passed; no reviews and `REVIEW_REQUIRED`. |
| Production deployment | `VERIFIED` | [GitHub deployment](https://github.com/hakimceliker/mauseai/deployments) `6793405140`, state `success`, environment `Production`, SHA `04256ac21a1c95da957fab501fc87c7acdf4cdd2`, [deployed URL](https://mauseai-8qp6ep1ez-hakimcelikerac-6069.vercel.app); matches verified `main`. |
| Production `/api/health` | `VERIFIED` (health only) | [GET endpoint](https://mauseai.vercel.app/api/health) returned HTTP 200 at `2026-10-01T20:19:55Z`: `healthy`, database `ready` (184 ms), payment provider `mock`, analytics `console`, notifications `console`, realtime `connected:false`. |
| Production `/api/health/ready` | `VERIFIED` (readiness only) | [GET endpoint](https://mauseai.vercel.app/api/health/ready) returned HTTP 200 and `{"ready":true}` at `2026-10-01T20:19:56Z`. This is not provider, tenant, or workflow acceptance. |
| Read-only production acceptance probe | `PARTIAL` | `node scripts/production-acceptance.mjs`, with `SMOKE_BASE_URL=https://mauseai.vercel.app` and all user/workflow credential variables explicitly absent, ran `2026-10-01T20:36:15Z`–`20:36:16Z`. Health/readiness HTTP 200, Inngest endpoint HTTP 401, anonymous task access HTTP 401; user-A/auth gates returned `credential_not_configured`; expected exit code 1. No authenticated request, task creation, or evidence-file write occurred. |
| Preview for #92/#95/#97 | `VERIFIED` | Vercel check and Preview Comments succeeded on each PR's current head. Preview success is not production acceptance. |

## Integration and acceptance status

| Area | Status | Evidence available | Missing evidence / safe next step |
|---|---|---|---|
| Supabase Auth | `BLOCKED — credential_not_configured` | Static code and regression test verify the Supabase user identity and resolve tenant membership from the server-side `users` row; client-controlled `user_metadata` and token metadata are not used as the tenant authority. | Approved test-user A/B credentials in approved secret store; live login/logout/token-expiry runs. |
| Tenant isolation and RLS | `NOT_RUN` | Tenant resolution has local regression coverage; RLS migrations and opt-in negative tests exist. These are code/test artifacts only and do not establish complete repository-level or live tenant isolation. | Review all service-role data paths, then use two authorized tenants to prove A/B isolation and cross-tenant denial against the target environment; verify applied migration state. |
| Inngest | `NOT_RUN` | Endpoint, worker code and acceptance runbook exist; public protected endpoint availability was previously recorded. | Approved workflow ID and test identity; capture real trigger/run/checkpoint/audit/retry/idempotency/failure/rollback evidence. |
| OpenAI | `PARTIAL` | Adapter and deterministic tests; local CI passed. | Approved runtime credential and redacted real call, token/cost and failure evidence. |
| Anthropic | `PARTIAL` | Adapter and deterministic tests; local CI passed. | Approved runtime credential and redacted real call, token/cost and failure evidence. |
| Local AI and cloud fallback | `PARTIAL` | Mock tests cover local response, fallback, recovery, endpoint restrictions, malformed payloads and model validation. | Approved private gateway plus isolated staging runtime; real Local → cloud → Local sequence is `NOT_RUN`. |
| Stripe | `NOT_RUN` | Health currently reports payment provider `mock`; sandbox test code/runbook may exist. | Stripe sandbox credentials, signed webhook, duplicate and refund/rollback simulation; no real payment. |
| PostHog | `NOT_RUN` | Health reports analytics `console`; integration evidence remains a planned issue. | Sanitized event delivery, tenant metadata and PII exclusion proof. |
| Sentry/Langfuse | `NOT_RUN` | Integration/runbook material exists. | Redacted error and trace capture, PII redaction, threshold/alert and trace-ID evidence. |
| Realtime | `PARTIAL` | Health reports `connected:false`. | Authenticated reconnect/disconnect and tenant-channel isolation tests. |
| Production incident/rollback | `NOT_RUN` | Documentation/runbook scaffolding exists. | Named operations owner and authorized rollback/incident rehearsal with redacted evidence. |

## Main protection and Actions control evidence

Final GitHub API reads on 2026-10-01 confirmed both the branch protection and
the repository ruleset `main-protection`, ID `24329825` (active for
`refs/heads/main`, no bypass actors). The ruleset reports
`created_at=2026-10-01T22:45:19.689+03:00` and
`updated_at=2026-10-01T23:23:03.942+03:00`. The final legacy
branch-protection GET was timestamped `2026-10-01T20:33:47Z`; the ruleset GET
was `2026-10-01T20:33:49Z`. The legacy endpoint is separate and has no
numeric ruleset ID. Its first read returned 404, which was not evidence that no
separate ruleset existed. See the exact policies and transparent
enable/restore/re-enable sequence in
[REPOSITORY_CONTROL_RECORD.md](REPOSITORY_CONTROL_RECORD.md).

GitHub Actions currently uses repository default token permission `read`;
workflow PR-review approval by Actions is disabled. The repository permits all
Actions and does not require SHA-pinned action references; those two repository
settings were inspected but not modified. Workflows use `pull_request` (not
`pull_request_target`) and declare read-only repository permissions except
CodeQL's security-events write permission.
