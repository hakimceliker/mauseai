# MouseAI — Canonical Evidence Register Gate

**Status:** `PARTIAL — RECONCILIATION REQUIRED`

This register defines the single evidence contract linking repository, branch, PR, commit, CI, deployment, live test, pilot, KPI and operating acceptance records.

## Required record

| Field | Rule |
|---|---|
| Gate and task | Must map to exactly one G0–G12 gate or canonical MOUSE issue |
| Repository and branch | Must identify the active canonical repository and branch |
| PR and commit | Must be verifiable in GitHub; merged status is separate from implemented status |
| CI/security | Record actual check links and conclusion |
| Environment | Record local, preview or production explicitly |
| Evidence | Link redacted output, timestamp and owner; never store secrets |
| State | Use only `PLANNED`, `IN_PROGRESS`, `VERIFIED`, `PARTIAL`, `BLOCKED`, `NOT_RUN`, `ACCEPTED` |
| Next action | One owner and one concrete next step are required |

## Reconciliation rules

1. A branch commit is not a main-branch acceptance.
2. Green CI is technical validation, not live integration or business acceptance.
3. Missing credentials, pilot data or human approval remain `BLOCKED`/`NOT_RUN`.
4. Every status claim must resolve to a current commit or timestamped evidence record.
5. Old roadmap and acceptance records must be linked to the canonical current record or marked superseded.

## Scope

This gate covers the evidence index for G0–G12, including Auth/RLS, Inngest, providers, integrations, pilot/KPI/finance, release/legal/support and final operating acceptance.

## Rollback

Revert this documentation-only PR. Existing evidence is not deleted or rewritten.
