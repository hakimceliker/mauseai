## Purpose

<!-- What problem does this change solve? Link the canonical issue (`Closes #...`) when applicable. -->

## Changed files and scope

<!-- List the meaningful files/areas changed and confirm this is limited to the approved scope. -->

- Repository: `hakimceliker/mauseai`
- Project: MouseAI only
- Changed files:

## Verification and CI

- Local test commands and results:
- CI run/link:
- Quality (lint, typecheck, tests, build): [ ] pass [ ] fail [ ] not run
- Secret scan: [ ] pass [ ] fail [ ] not run
- Dependency audit: [ ] pass [ ] fail [ ] not run
- Docker: [ ] pass [ ] fail [ ] not run
- CodeQL: [ ] pass [ ] fail [ ] not run
- Vercel Preview: [ ] pass [ ] fail [ ] not run

## Security and data safety

- Secret used or changed? [ ] no [ ] yes — identify the secret *name only*, never its value:
- Real customer data used? [ ] no [ ] yes (explain approval and redaction):
- Server-only secrets remain server-side: [ ] yes [ ] N/A
- Missing credentials remain `credential_not_configured`: [ ] yes [ ] N/A
- No live payment or irreversible production action introduced: [ ] confirmed [ ] N/A

## Migration and production impact

- Database/schema migration? [ ] no [ ] yes — describe compatibility and rollout:
- Production impact: [ ] none [ ] additive [ ] behavior change [ ] breaking (explain):
- Deployment/monitoring considerations:

## Evidence

- Commit:
- Pull request:
- CI / CodeQL / secret-scan links:
- Runtime or production evidence (redacted):
- Evidence file:

## Rollback

<!-- State the exact safe rollback/revert method and any data compatibility considerations. -->

## Reviewer checklist

- [ ] Scope and changed files match the stated purpose
- [ ] Tests and required CI/security gates have passed
- [ ] No secret, token, or customer data is exposed
- [ ] Migration and production impact have been reviewed
- [ ] Evidence supports all completion claims
- [ ] Rollback is safe and documented
