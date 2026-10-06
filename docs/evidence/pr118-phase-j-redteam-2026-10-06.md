# PR #118 — Phase J red-team evidence

- Branch: `pr/final-cleanup-and-signatures`
- Scope: 39 defined red-team scenarios
- Local executable coverage: **19/39 scenario IDs covered by 15 passing tests**
- Remaining: **20/39 BLOCKED** pending live infrastructure, external providers, or human/pilot evidence

## Local scenarios executed

The executable local suite is `src/core/testing/phase-j-local-redteam.test.ts` and currently verifies:

- permission boundary and tool scope denial;
- tenant isolation;
- append-only evidence snapshots;
- terminal task-state protection;
- approval audit integrity and mandatory rejection reasons;
- budget overflow rejection;
- dependency cycle detection;
- production evidence completeness gate;
- provider health degradation;
- provider-failure classification;
- telemetry credential redaction.

Result: **15/15 tests passed**, covering 19 scenario IDs, in the local runtime-contract suite.

## Explicitly blocked scenarios

The remaining scenarios are not represented as PASS. They require real Supabase Auth/RLS, network and rate-limit controls, process/container resource isolation, production watchdog and recovery drills, real provider credentials, supply-chain execution evidence, pilot data, or independent human review. The Phase J structure marks those cases `BLOCKED` until the required environment and authority exist.

This evidence is technical local coverage only; it is not production acceptance.
