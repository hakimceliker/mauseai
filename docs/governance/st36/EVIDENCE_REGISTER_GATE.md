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

## Canonical mapping fields

Every evidence row must also carry these identifiers:

| Field | Required value |
|---|---|
| Canonical gate | One of `G0` through `G12`; do not invent parallel gate names |
| Canonical task | One MOUSE/PLAN identifier or an explicitly approved `OPERATIONS` record |
| Source repository | `hakimceliker/mauseai` for this project |
| Source branch | Exact Git ref that produced the evidence |
| Source commit | Full SHA, not only a short label |
| PR | Full GitHub PR URL or `N/A` for a non-code operational record |
| Environment | `local`, `preview`, `production`, or `pilot` |
| Deployment | Provider name, deployment URL or ID, and deployed commit SHA |
| Recorded at | ISO-8601 timestamp and evidence owner |

## Status normalization

| Source status | Canonical status |
|---|---|
| planned, todo | `PLANNED` |
| doing, in progress | `IN_PROGRESS` |
| green CI, implemented | `VERIFIED` only for the stated technical scope |
| partially complete | `PARTIAL` |
| credential missing, human decision missing, quota blocked | `BLOCKED` |
| not executed or no runtime result | `NOT_RUN` |
| all required evidence and approval present | `ACCEPTED` |

`VERIFIED` never implies live production or business acceptance unless the environment and evidence explicitly say so.

## G0–G12 taxonomy

The canonical gate names for this repository are:

`G0` project opening · `G1` problem validation · `G2` founding model · `G3` scope/pilot · `G4` budget/capacity · `G5` architecture · `G6` contracts/security · `G7` Auth/tenant/RLS · `G8` durable workflow · `G9` providers/observability · `G10` pilot/KPI/finance · `G11` release/legal/support · `G12` operating acceptance.

Older records using a different phase count must be marked `SUPERSEDED` or mapped to these names; they must not silently close a current gate.

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
