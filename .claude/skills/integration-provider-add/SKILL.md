---
name: integration-provider-add
description: Use when adding a new payment/notification/analytics/realtime provider under src/lib/integrations — follows the existing adapter+mock pattern.
---

# Integration Provider Add

`src/lib/integrations/` uses an adapter pattern: every integration type (payment, notification, analytics, realtime) has an interface plus a `mock` implementation that's the safe default.

## Steps

1. Read the existing interface for the integration type (e.g. payment) and its current providers (e.g. `mock`, `stripe`) to match the shape exactly.
2. Implement the new provider against the same interface — don't change the interface itself unless every existing provider is updated too.
3. Wire it into the provider-selection switch keyed by the relevant env var (e.g. `PAYMENT_PROVIDER_TYPE`), defaulting to `mock` if unset or misconfigured — mock must remain the safe fallback, never silently fall through to a half-configured real provider.
4. Add the new env vars to `.env.example` as commented-out placeholders ("Add actual key in .env.local only"), matching the existing convention — never commit real credentials.
5. Add a test that exercises the new provider against the shared interface contract, plus a test confirming the mock path still works when env vars are absent.
