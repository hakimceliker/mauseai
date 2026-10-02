# MouseAI G10 — Pilot charter and scenario reconciliation

**Status:** `DRAFT — INPUTS REQUIRED`  
**Gate:** `G10 — pilot + KPI + finance`  
**Prepared:** 2026-10-02  
**Branch:** `chore/g10-pilot-finance-reconcile`

## Decision this package supports

Determine whether MouseAI should proceed from technical readiness into a controlled
commercial or internal-use pilot, and under what operating and financial limits.

This package is a measurement design and decision record. It is not evidence that a
pilot ran, that a customer exists, or that G10 passed.

## Reconciled pilot scenarios

| ID | Scenario | Intended user/result | Current evidence | Status |
|---|---|---|---|---|
| `PILOT-API-MAINTENANCE` | API maintenance workflow | A scoped maintenance task produces a tested, reviewable change with impact and rollback evidence. | No redacted customer run, task sample, timing, quality score, cost, or acceptance record found in the repository. | `PREPARED — DATA MISSING` |
| `PILOT-WINDOWS-RUNNER` | Windows computer runner | Two pre-authorized computer tasks complete with correct result, approval trace, and negative-test evidence. | No redacted customer/device run, task sample, timing, quality score, cost, or acceptance record found in the repository. | `PREPARED — DATA MISSING` |

## Measurement design

Each scenario must use paired work where possible: the same task scope, input
conditions, quality rubric, and acceptance rule are recorded for the baseline method
and the MouseAI method. A technical success alone is insufficient; user outcome,
human correction effort, full relevant cost, and customer/internal acceptance must be
captured.

Required evidence per scenario:

1. approved scope, tenant/data boundary, and pilot dates;
2. task sample and inclusion/exclusion rule;
3. baseline method result and MouseAI result;
4. time, revisions, quality score, and relevant cost for both paths;
5. failure, escalation, approval, rollback, and data-handling records;
6. redacted acceptance statement and decision owner.

## Baseline and target rule

No baseline or target is invented in this package. The KPI register uses `null` plus
`VERİ YOK`/`HEDEF BEKLİYOR` until an authorized owner supplies the value, unit,
window, sample minimum, and source query/version. A missing input must never be
converted to zero or treated as a pass.

Targets are proposed only after the baseline sample and acceptance rubric are
approved. The target-setting record must state whether the target is a hard gate,
warning, or learning target.

## G10 decision states

- `PREPARED — DATA MISSING`: structure and measurement contract exist; no real pilot
  conclusion is allowed.
- `PILOT RUNNING`: approved scope and live measurement are active.
- `REVIEW REQUIRED`: evidence exists but quality, cost, or acceptance review is open.
- `G10 ACCEPT`: both scenarios have accepted evidence, reconciled KPI outputs, and a
  reviewed 13-week cash model.
- `G10 HOLD`: evidence, safety, economics, or authority is insufficient.

Current package state: **`G10 HOLD — PILOT, KPI, AND FINANCE INPUTS REQUIRED`**.

