# MouseAI G10 — Financial model contract

**Status:** `DRAFT — INPUTS REQUIRED`  
**Currency:** `KARAR BEKLİYOR`  
**Horizon:** 13 weekly cash periods plus low/base/high operating scenarios  
**Rule:** No amounts are fabricated. Blank cells and `null` values are unresolved inputs, not zero.

## Required model logic

- Monthly revenue = active customers × package price + transaction/licence/service revenue.
- Variable cost = model/API + data/connector + infrastructure + payment + transaction support cost.
- Contribution = net revenue − variable cost.
- Break-even customers = fixed cost / contribution per customer, only when denominator is valid.
- CAC = sales and marketing expense / new customers, only when both inputs exist.
- Churn and retention are separate measures and require a defined cohort/window.
- Cash is distinct from profit; opening cash, collections, financing, and payment timing must be sourced.

## Scenario register

| Scenario | Revenue drivers | Cost drivers | Cash conclusion |
|---|---|---|---|
| Low | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` |
| Base | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` |
| High | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` | `KARAR BEKLİYOR` |

The scenario labels are required decision branches, not forecasts. Each branch must
be populated from an approved assumption register and reconciled to the same period,
segment, task unit, currency, and data version.

## 13-week cash model

The row-level input contract is in `MOUSE_G10_13_WEEK_CASH.csv`. Required fields are
opening cash, collections, confirmed financing, model/runner/tools, infrastructure,
team/support, other outflows, closing cash, actual/forecast flag, source, owner, and
status. The closing balance must reconcile as:

`opening cash + collections + confirmed financing − total outflows`.

Do not enter financing as confirmed without a source and authorization. Allocate
shared costs with a documented key; the allocated total must equal the shared-cost
pool, and direct costs must not be counted again in the pool.

## Current financial decision

`HOLD — no pricing, margin, break-even, runway, funding-gap, or financing suitability
claim can be made until the missing inputs are supplied and reviewed.`

