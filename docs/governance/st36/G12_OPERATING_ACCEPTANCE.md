# MouseAI G12 — Operating Acceptance Gate

**Status:** `OPEN — LIVE OPERATING EVIDENCE REQUIRED`
**Owner:** Operations owner (to be named)
**Branch:** `stage/g12-operating-acceptance`

G12 is the final operating gate. It cannot be closed by code, CI, health or
documentation evidence alone.

## Required live evidence

- Authenticated tenant test with two users and two tenants.
- RLS denial for cross-tenant reads and writes.
- Inngest production trigger, worker completion, checkpoint, audit and retry.
- Idempotency and rollback/failure-path evidence.
- OpenAI and Anthropic provider calls, cost/token records and local-to-cloud
  fallback evidence, without exposing credentials.
- Stripe sandbox webhook, PostHog event, Sentry/Langfuse trace and realtime
  connection evidence.
- Two real pilot outcomes with baseline, target, result and customer sign-off.
- KPI cards populated from dated sources and the approved 13-week finance model.
- On-call ownership, incident drill, backup/restore and support handoff.

## Acceptance table

| Gate | Required proof | Status |
| --- | --- | --- |
| Auth and tenant isolation | Redacted test record | `BLOCKED` |
| Durable workflow | Trigger/checkpoint/audit record | `BLOCKED` |
| Provider and integration runtime | Provider-safe evidence bundle | `BLOCKED` |
| Pilot/customer value | Two signed pilot records | `BLOCKED` |
| KPI and finance | Source-linked approved model | `BLOCKED` |
| Operating readiness | Named owners + drill result | `NOT_RUN` |
| Independent approval | Maintainer review and decision | `BLOCKED` |

## Decision rule

G12 is `ACCEPTED` only when every row is `PASS` and the evidence register links
to immutable artifacts. Otherwise the project remains
`PARTIAL — NOT PRODUCTION-READY`.

## Rollback and rejection

If a live gate fails, record the failure as `BLOCKED` or `REJECTED`, preserve the
evidence, revert only the related change through its PR, and open a corrective
branch. Never replace a missing live result with a mock PASS.
