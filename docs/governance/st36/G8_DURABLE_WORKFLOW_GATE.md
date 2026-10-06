# MouseAI G8 — Durable Workflow Gate

**Status:** `BLOCKED — PRODUCTION RUNTIME EVIDENCE REQUIRED`
**Branch:** `stage/g8-durable-workflow`

## Required proof

- Production `task/run` trigger and workflow identifier.
- Worker execution and terminal result.
- Checkpoint and audit rows tied to one correlation ID.
- Retry after transient failure without duplicate side effects.
- Idempotent duplicate trigger result.
- Failure path to `FAILED` or `BLOCKED` and safe rollback evidence.
- Redacted Inngest/Vercel/Supabase timestamps and logs.

## Acceptance table

| Test | Required evidence | Status |
| --- | --- | --- |
| Trigger/worker | Runtime event and completion | `BLOCKED` |
| Checkpoint/audit | Correlated persistence records | `BLOCKED` |
| Retry | One safe retry trace | `BLOCKED` |
| Idempotency | Duplicate-event result | `BLOCKED` |
| Failure/rollback | Rehearsal record | `BLOCKED` |

Mocks may validate code paths but cannot close G8.
