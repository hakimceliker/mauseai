## Summary

<!-- What changed and why? Link the issue with `Closes #...` when applicable. -->

## Scope and ownership

- [ ] Correct repository: `hakimceliker/mauseai`
- [ ] Correct project: MouseAI only
- [ ] Files changed are within the task ownership boundary
- [ ] No unrelated project, branch, deployment, or secret was touched

## Required gates

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test -- --run`
- [ ] `npm run build`
- [ ] `npm run verify`
- [ ] `npm audit --audit-level=high`
- [ ] Secret scan
- [ ] Docker build

## Security and data safety

- [ ] No secret/API key/token/private key added to source, logs, docs, or commits
- [ ] No real customer data used
- [ ] No live payment or irreversible production action introduced
- [ ] Missing credentials are reported as `credential_not_configured`
- [ ] Server-only secrets remain server-side

## Evidence

- Commit:
- CI run:
- Test summary:
- Security summary:
- Production impact:

## Rollback

<!-- Describe the safe revert or rollback path. -->
