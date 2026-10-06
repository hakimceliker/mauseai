## Summary

<!-- What changed and why? Link the issue with `Closes #...` when applicable. -->

## Change scope

- Related issue, PLAN-ID, P-package, or G-gate:
- Current `main` base commit:
- Behavior or records changed:
- Explicitly not changed:

## Scope and ownership

- [ ] Correct repository: `hakimceliker/mauseai`
- [ ] Correct project: MouseAI only
- [ ] Files changed are within the task ownership boundary
- [ ] No unrelated project, branch, deployment, or secret was touched
- [ ] Any source version/hash mismatch is recorded without overwriting prior evidence
- [ ] No user, sponsor, risk owner, reviewer, pilot, or acceptance decision was invented

## Required gates

- [ ] `npm run lint` — result:
- [ ] `npm run typecheck` — result:
- [ ] `npm run test -- --run` — result:
- [ ] `npm run build` — result:
- [ ] `npm run verify` — result:
- [ ] `npm audit --audit-level=high` — result:
- [ ] Secret scan — result/link:
- [ ] Docker build — result/link:
- [ ] CodeQL — result/link:
- [ ] Vercel Preview — result/link, or not applicable with reason:
- [ ] Independent maintainer review obtained; author self-review is not independent

## Security and data safety

- [ ] No secret/API key/token/private key added to source, logs, docs, or commits
- [ ] No real customer data used
- [ ] No live payment or irreversible production action introduced
- [ ] Missing credentials are reported as `credential_not_configured` and live tests remain `NOT_RUN`
- [ ] Server-only secrets remain server-side
- [ ] External actions use least-privilege token permissions and fork-safe events

## Evidence

- Commit:
- CI run:
- Test summary:
- Security summary:
- Production impact:
- Live evidence and limitations:

## Rollback

<!-- Describe the safe revert or rollback path. -->
