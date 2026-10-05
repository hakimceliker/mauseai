# PR #118 SSRF allowlist recheck — 2026-10-06

## Scope

The Phase C-E credential executor's outbound probe boundary was reviewed after
CodeQL reported `File data in outbound network request` on
`scripts/phase-c-e-executor.ts`.

## Fix applied

- Unknown domains now fail closed instead of being accepted as non-IP hosts.
- Only loopback hosts and `*.supabase.co` are accepted by the executor's
  endpoint policy.
- Only `http:` and `https:` protocols are accepted.
- The validated `URL` object is passed to the HTTP client; the raw input string
  is not used to select the client or destination.
- The executable entrypoint is guarded so the endpoint policy can be tested
  without starting credential validation.

## Verification

- Targeted regression: `tests/security/phase-c-e-ssrf.test.ts`
  - 9 tests passed.
  - Covers supported loopback/Supabase hosts and unknown/private hosts.
- Full local verification: `npm run verify`
  - lint: 0 errors, 75 pre-existing warnings
  - typecheck: passed
  - Vitest: 42 files passed, 581 passed, 16 skipped (597 total)
  - Next production build: passed

## Acceptance status

This is a source-level security fix and does not close PR #118. Independent
write-authorized review, Judge decision, production Auth/RLS/Inngest/provider
evidence, pilot/KPI/finance evidence, and final acceptance remain required.
