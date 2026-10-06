# MouseAI G7 — Auth, Tenant and RLS Gate

**Status:** `BLOCKED — LIVE CREDENTIALS REQUIRED`
**Branch:** `stage/g7-auth-tenant-rls`

## Required proof

- Two approved test users and two isolated tenants.
- Login, logout, refresh and expired-token results.
- Same-tenant read/write success.
- Cross-tenant read/write rejection with `403` or RLS denial.
- Server-side identity derived from the Supabase bearer token; client headers
  cannot select another tenant.
- Redacted request IDs, timestamps, response codes and database evidence.

## Acceptance table

| Test | Required evidence | Status |
| --- | --- | --- |
| Login and refresh | Redacted auth record | `BLOCKED` |
| Tenant isolation | Two-tenant matrix | `BLOCKED` |
| RLS negative path | Denial response + policy record | `BLOCKED` |
| Logout/expiry | Session result | `BLOCKED` |
| Credential safety | No token in repo/logs | `NOT_RUN` |

No G7 acceptance is allowed until the live evidence bundle is attached.
