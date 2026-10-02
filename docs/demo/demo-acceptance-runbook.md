# MouseAI Demo / Staging Acceptance

This runbook defines the safe demo layer for local and preview validation.

## Demo identity model

- Demo users are synthetic test identities used by the mock auth boundary.
- Demo tenant IDs are fixed UUID-shaped test values in the test suite only.
- No real email, password, API key, refresh token, service-role key, payment method, or production identity is committed.
- A real Supabase user is created only during a separately approved staging test, using the Supabase dashboard or a secret manager.

## Acceptance checks

1. Anonymous requests return `401`.
2. Demo tenant A sees only tenant A data.
3. Demo tenant B sees only tenant B data.
4. New execution contracts start in `pending` approval state.
5. Responses do not expose passwords, secrets, or tokens.

## Running locally

```powershell
$env:AUTH_PROVIDER = "mock"
npm run test -- --run src/__tests__/demo-acceptance.test.ts
```

This is a non-production test. It does not call Supabase, Inngest, OpenAI, Anthropic, Stripe, PostHog, Sentry, or Langfuse.

## Staging handoff

The live acceptance runner remains separate:

```powershell
npm run acceptance:production
```

It requires externally supplied credentials and reports `credential_not_configured` when they are absent. No demo credential is used as a production credential.
