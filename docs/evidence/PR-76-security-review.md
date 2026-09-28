# PR #76 Security Review

Date: 2026-09-28
Repository: `hakimceliker/mauseai`
Reviewed revision: `42f94b6`
Review status: `CHANGES_REQUIRED` until the fix commit is reviewed and merged.

## Findings and remediation

| ID | Severity | Finding | Remediation in this branch |
|---|---|---|---|
| AUTH-001 | High | Production could be configured to accept spoofable mock headers. | Production now rejects `AUTH_PROVIDER=mock`; regression test added. |
| AUTHORIZATION-001 | High | Core RLS policies used a different tenant resolver from the Supabase Auth mapping. | Migration `0012_authoritative_tenant_rls.sql` standardizes core policies on `public.get_tenant_id()`. |
| SECRETS-001 | Medium | The admin database client silently fell back to the anonymous key. | The admin client now fails closed when the service-role credential is absent. |
| XSS-001 | Medium | CSP allowed `unsafe-eval`. | `unsafe-eval` removed from `script-src`. |
| PRIVACY-001 | Medium | Analytics filtering allowed arbitrary event properties and tenant identifiers. | PostHog now uses an explicit allowlist and omits tenant identifiers. |

## Verification

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test -- --run` — 28 files, 266 passed, 16 skipped
- `npm run build` — passed
- `npm audit --audit-level=high` — 0 vulnerabilities
- Secret values were not added to source, commits, logs or this document.

## Remaining proof gaps

- Supabase migration replay and authenticated two-tenant negative tests require the production project and a valid test session.
- Production readiness must be checked after this branch is deployed; no production merge is implied by this report.
- Independent Claude review is still required before merge.
