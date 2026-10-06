# PR #118 — Phase I core integration evidence

- Verified code commit: `3b1c863`
- Verification scope: Phase I scenarios 1–38
- Test file: `src/core/testing/phase-i-core-flow.test.ts`
- Result: **38/38 passed** in the local runtime-contract suite

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
26. Audit trace integrity: lifecycle records preserve task identity and cost accounting.
27. Cost control: actual spend, budget threshold alerts, and over-budget rejection are enforced.
28. Application tenant guard: cross-tenant records are filtered and denied by default.
29. Append-only evidence boundary: stored evidence remains available through immutable snapshots.
30. Approval audit ordering: request and approval events remain chained and timestamped.
31. Timeout recovery: bounded retries exhaust deterministically with retry accounting.
32. Provider failure recovery: unavailable-provider errors route to fallback-provider handling.
33. Corrupt-data recovery: checksum/data errors route to checkpoint recovery.
34. Duplicate task protection: equivalent submissions receive one deterministic fingerprint.
35. Stale-task detection: idle work is detected and exposed for escalation.
36. Conflict resolution: divergent agent outputs are detected and confidence-arbitrated.
37. State consistency: terminal CLOSED state rejects concurrent illegal transitions.
38. Full lifecycle: evidence, CI, independent review, judge PASS, and closure gate complete together.

Full local verification after this change:

- `npm run verify`: PASS
- ESLint: 0 errors; warnings are non-blocking existing/style warnings
- TypeScript: PASS
- Vitest: 45 files, 633 passed, 16 skipped (649 total)
- Next production build: PASS

The 38 scenarios now have local runtime-contract coverage. Live acceptance remains open for Supabase Auth/RLS, real provider credentials, pilot/KPI/finance, production deployment, independent review, and the 39 Phase J red-team scenarios. This document does not claim final acceptance is complete.
