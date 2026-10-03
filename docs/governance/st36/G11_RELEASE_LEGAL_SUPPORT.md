# MouseAI G11 — Release, Legal and Support Gate

**Status:** `OPEN — EVIDENCE REQUIRED`
**Owner:** Release owner (to be named)
**Branch:** `stage/g11-release-legal-support`

G11 may not be marked complete from documentation alone. It closes only after the
release candidate, legal/safety review, support readiness and rollback evidence
are attached to the canonical evidence register.

## Required deliverables

- Release candidate version, commit SHA and deployment URL.
- Product terms, privacy notice, AI-use disclosure and support contact approved
  for the target market.
- Data-retention, deletion, tenant isolation and incident-response statements.
- Support runbook: intake, severity, response target, escalation and closure.
- Release notes, known limitations and user-facing rollback communication.
- Backup/restore and rollback rehearsal with timestamped evidence.
- Independent review result and unresolved-risk disposition.

## Acceptance checks

| Check | Evidence | Status |
| --- | --- | --- |
| Release candidate reproducible | SHA + CI/deployment record | `NOT_RUN` |
| Legal/privacy review | Named reviewer + decision record | `BLOCKED` |
| Support runbook tested | Tabletop or real rehearsal record | `NOT_RUN` |
| Rollback tested | Before/after health and data checks | `NOT_RUN` |
| Known risks disclosed | Release note + risk register link | `NOT_RUN` |
| Independent approval | GitHub review by authorized maintainer | `BLOCKED` |

## Stop conditions

Do not call G11 accepted when a legal owner, release artifact, rollback proof,
support rehearsal or independent review is missing. No customer or payment
claim may be inferred from a green CI run.

## Rollback

Revert this documentation-only branch/PR. A production rollback must follow the
approved deployment provider procedure and be recorded with the affected SHA.
