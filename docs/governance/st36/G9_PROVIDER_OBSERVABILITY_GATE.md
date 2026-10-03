# MouseAI G9 — Provider and Observability Gate

**Status:** `BLOCKED — PROVIDER RUNTIME EVIDENCE REQUIRED`
**Branch:** `stage/g9-provider-observability`

## Required proof

- OpenAI and Anthropic production-safe test calls with redacted request IDs.
- `credential_not_configured` behavior when a provider credential is absent.
- Local AI first attempt, timeout/error classification and automatic cloud
  fallback when the local endpoint is unavailable.
- Provider/model, route (`LOCAL` or `CLOUD`), fallback reason, latency, token
  count and estimated cost recorded without prompt or secret content.
- Stripe sandbox webhook, PostHog event, Sentry/Langfuse trace and realtime
  connection evidence.

## Acceptance table

| Area | Required evidence | Status |
| --- | --- | --- |
| OpenAI adapter | Redacted runtime result | `BLOCKED` |
| Anthropic adapter | Redacted runtime result | `BLOCKED` |
| Local/cloud fallback | Controlled outage trace | `BLOCKED` |
| Cost and token ledger | Source-linked record | `BLOCKED` |
| Observability/integrations | Trace/event/webhook bundle | `BLOCKED` |

No live credential is to be committed, copied into chat, or printed in logs.
