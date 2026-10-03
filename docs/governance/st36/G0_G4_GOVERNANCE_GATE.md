# MouseAI — G0–G4 Governance Gate

**Status:** `PARTIAL — PENDING DECISION EVIDENCE`

This document is the canonical acceptance gate for project opening, problem validation, model definition, scope/pilot agreement, and budget/capacity limits.

## Gate checklist

| Gate | Required evidence | Current state |
|---|---|---|
| G0 project opening | Named product owner, sponsor, risk owner, cost centre, canonical repository and startup decision | `PENDING` |
| G1 problem validation | Real problem statement, target user, baseline and validation record | `PENDING` |
| G2 founding model | Five founding models populated with source, owner and review date | `PENDING` |
| G3 scope and pilot | Pilot charter, in/out scope, success contract and rejection criteria | `PARTIAL` |
| G4 budget and capacity | 13-week budget inputs, provider cost limits, capacity ceiling and downside scenario | `PARTIAL` |

## Required artifacts

- `OWNERSHIP_MATRIX.md`
- `STARTUP_DECISION.md`
- `RISK_REGISTER.md`
- `docs/pilot/MOUSE_G10_PILOT_CHARTER.md`
- `docs/finance/MOUSE_G10_13_WEEK_CASH.csv`
- `docs/finance/MOUSE_G10_FINANCE_MODEL.md`
- Source/hash register for the governing documents

## Acceptance rules

1. A template or proposed owner is not evidence of a completed gate.
2. Missing human decisions remain `PENDING`; they must not be converted to `PASSED` by CI.
3. Budget, pilot and customer data must be redacted and traceable to an approved source.
4. This documentation-only PR does not grant authority, change production, or close any live acceptance gate.

## Rollback

Revert this documentation-only PR. No application or production state is changed.
