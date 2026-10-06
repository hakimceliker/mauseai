# PR #118 — Phase I core integration evidence

- Verified code commit: `PENDING` (this evidence is updated in the same change)
- Verification scope: Phase I scenarios 1–25
- Test file: `src/core/testing/phase-i-core-flow.test.ts`
- Result: **25/25 passed**

Implemented runtime coverage:

1. Task closure gate: test evidence, CI evidence, independent review, judge PASS, and CLOSED transition.
2. Dependency runner: dependent task executes only after its prerequisite.
3. Independent task execution: three dependency-free tasks execute without blocking.
4. Recovery/watchdog: stale task detection, timeout classification, and retry recovery plan.
5. Agent selection: registry selects an available capable agent distinct from the executor.
6. Independent review: self-review is rejected and a distinct reviewer is accepted.
7. Judge gate: all ten acceptance criteria are evaluated and PASS is produced only when all are true.
8. Judge independence: executor self-judgment is rejected.
9. Evidence redaction: detected secret material is rejected and redacted output is safe.
10. Human approval: critical operation enforcement fails closed until approval is granted.
11. Capability routing: the compatible specialist wins while a general compatible alternative remains available.
12. Capability routing fail-closed behavior: no compatible agent returns no selection and requires approval.
13. Local-first model routing: the local provider is preferred when routing has no bound agent model.
14. Model fallback constraints: fallback selection respects cost, latency, token, and zero-cost local execution constraints.
15. Provider health gate: three consecutive failures transition a provider to DOWN and readiness zero.
16. Handoff contract: valid inter-agent transfer preserves routing facts, SHA, schema version, and result validation.
17. Handoff safety: circular self-handoff is rejected.
18. Handoff failure safety: failure results require an explicit reason.
19. Execution context gate: incomplete dependencies prevent closure until evidence and independent review are present.
20. Execution context continuity: trace identity, cost accounting, dependency state, and audit entries survive handoff work.
21. Permission fail-closed baseline: unknown agents and tools are denied.
22. Permission enforcement: tool allowlists and required permission levels are enforced and audited.
23. Tool allowlist lifecycle: explicit grant and revoke operations control access.
24. Critical approval gate: secret operations remain denied after pending or rejected human approval.
25. Approval audit integrity: chained approval events detect tampering.

Full local verification after this change:

- `npm run verify`: PASS
- ESLint: 0 errors, 75 existing warnings
- TypeScript: PASS
- Vitest: 43 files, 591 passed, 16 skipped
- Next production build: PASS

Remaining acceptance scope is intentionally open: Phase I scenarios 26–38 and all 39 Phase J red-team scenarios still require implementation and evidence. This document does not claim Phase I, Phase J, or final acceptance is complete.
