# MouseAI pilot, KPI, finance, release and operations register

- **Last verified:** 2026-10-01
- **Status:** `PARTIAL — NOT PRODUCTION-READY`

This is a status/evidence register, not a filled business model. Unknown fields
remain `NOT PROVIDED`, `VERİ YOK`, or `KARAR BEKLİYOR`; no price, cost, baseline,
target, capacity, customer, or date is inferred.

## Pilot A and Pilot B

| Field | Pilot A | Pilot B |
|---|---|---|
| Process/user | `NOT PROVIDED` | `NOT PROVIDED` |
| Authorized participant and decision owner | `DECISION_PENDING` | `DECISION_PENDING` |
| Start/end date | `NOT PROVIDED` | `NOT PROVIDED` |
| Baseline and sample | `NOT PROVIDED` | `NOT PROVIDED` |
| Target and stop criteria | `DECISION_PENDING` | `DECISION_PENDING` |
| Workflow and safety/security review | `NOT_RUN` | `NOT_RUN` |
| Error rate, time/cost savings, user benefit | `NOT_RUN` | `NOT_RUN` |
| Acceptance/rejection | `DECISION_PENDING` | `DECISION_PENDING` |

No pilot was created or represented as run. Legal/privacy and G0 prerequisites
must be accepted before any real user or customer data is introduced.

## KPI definitions

The canonical KPI cards remain a definition/template source. For each KPI,
measurement is `NOT_RUN` until it has a named accepted owner, formula and
denominator, exclusions, versioned query/data source, zero-denominator
handling, baseline, target, warning/critical thresholds, cadence, last measured
value, and redacted evidence link. No current KPI result or owner is inferred.

## Finance and unit economics

`MAUSEAI_13_Haftalik_Nakit_Girdi_Sablonu.csv` remains blank with each week
`GİRDİ BEKLİYOR`. The submitted data-request workbook is a template; requested
financial inputs were not supplied. Development/provider/infrastructure/task/
tenant/pilot costs, revenue/pricing, downside, capacity and budget alerts are
therefore `VERİ YOK` / `KARAR BEKLİYOR`. Do not fill numeric assumptions without
an authorized data source and owner.

## Release and operations

| Control | Status | Evidence / remaining action |
|---|---|---|
| Current production deployment | `VERIFIED` | GitHub Production deployment `6793405140`, successful, SHA equal to current main. |
| Version tag/changelog for this work | `NOT_RUN` | PR #97 is unmerged; no release tag/changelog is created by this branch. The live GitHub releases query returned no releases. |
| Backup/restore procedure | `PARTIAL` | Documentation/runbook scaffolding exists; approved restore rehearsal not run. |
| Incident response/support | `PARTIAL` | Templates/runbook scaffolding exists; named on-call/support owner and rehearsal pending. |
| Rollback rehearsal | `NOT_RUN` | No authorized live rehearsal. PR changes remain revertible. |
| Legal terms/privacy documents | `BLOCKED — DECISION_PENDING` | No qualified legal review or approval recorded. |
| Sustainable operation/G12 | `BLOCKED` | Owner, budget, KPI, support, backup/restore and operating evidence remain open. |

The safe repository rollback is to revert the PR commit. Production rollback,
restore, and incident actions require the designated human operations owner.
