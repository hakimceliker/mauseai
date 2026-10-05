# G10 reconciliation record — MouseAI

**Date:** 2026-10-02  
**Branch:** `chore/g10-pilot-finance-reconcile`  
**Gate:** G10 — pilot + KPI + finance  
**Result:** `HOLD — DATA AND AUTHORITY REQUIRED`

## Package created

| Artifact | Purpose | Truth status |
|---|---|---|
| [`docs/pilot/MOUSE_G10_PILOT_CHARTER.md`](../../pilot/MOUSE_G10_PILOT_CHARTER.md) | Two pilot scenarios, paired baseline method, evidence and decision states | Measurement design; no observed result |
| [`docs/pilot/MOUSE_G10_PILOT_SCENARIOS.json`](../../pilot/MOUSE_G10_PILOT_SCENARIOS.json) | Machine-readable scenario register | Customer, dates, samples and results are null |
| [`docs/kpi/MOUSE_G10_KPI_CARDS.json`](../../kpi/MOUSE_G10_KPI_CARDS.json) | Nine atomic KPI cards and missing-data behavior | Baseline, target, owner, window are null |
| [`docs/finance/MOUSE_G10_FINANCE_MODEL.md`](../../finance/MOUSE_G10_FINANCE_MODEL.md) | Financial model contract and scenario rules | No forecast amounts or financing conclusion |
| [`docs/finance/MOUSE_G10_13_WEEK_CASH.csv`](../../finance/MOUSE_G10_13_WEEK_CASH.csv) | 13-week cash input table | All weeks require inputs |

## Reconciliation against existing sources

- Existing `MAUSEAI_KPI_Kartlari.json` has KPI definitions but null baseline,
  target, owner, thresholds, unit, and source query fields. This package preserves
  those nulls and narrows the G10 set to atomic pilot/quality/economics measures.
- Existing `MAUSEAI_13_Haftalik_Nakit_Girdi_Sablonu.csv` is blank. The new CSV adds
  explicit total-outflow and actual/forecast columns but does not populate amounts.
- Existing governance records state that pilot, KPI, and finance evidence are
  unavailable and that G10 cannot be accepted from documentation alone.
- The branch map names API maintenance and Windows runner as the two G10 pilot
  tracks; both are recorded here without inventing a customer or result.

## Validation outcome

Structural validation must confirm that the JSON files parse, both scenario IDs are
present, nine KPI cards are present, and the cash table has exactly 13 weeks. The
expected result is `STRUCTURE_VALID / G10_NOT_ACCEPTED` until pilot and finance
inputs are supplied.

## Required next inputs

1. authorized pilot owner and decision owner;
2. redacted paired pilot records for both scenarios;
3. approved KPI windows, sample minimums, baselines, targets, and query versions;
4. currency, price/package assumptions, cost ledger, opening cash, collections, and
   financing evidence;
5. independent review and acceptance record.
