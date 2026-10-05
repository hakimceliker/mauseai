# MouseAI Canonical Evidence Register Gate

**Scope:** G0–G12 acceptance records for `hakimceliker/mauseai`.

This document is the canonical contract for reconciling implementation status,
GitHub delivery state, runtime evidence, and LETFON 01–40 acceptance. A branch,
issue, green local test, preview deployment, or bot comment is never sufficient
to close a gate by itself.

## 1. Canonical identity rules

Every evidence row MUST contain exactly one canonical gate (`G0`–`G12`) and may
contain one canonical MOUSE task ID. The task ID, gate, repository and scope are
stable identifiers; wording changes do not create a new task. Historical rows
remain immutable and a new SHA creates a new evidence observation, not an
overwrite of the old result.

Required identity fields:

| Field | Requirement |
|---|---|
| `gateId` | Exactly one value from `G0` through `G12` |
| `taskId` | Canonical `MOUSE-*` or `PLAN-*` identifier when applicable |
| `repository` | `hakimceliker/mauseai` |
| `branch` | Exact GitHub branch name |
| `pr` | GitHub PR number or `NOT_APPLICABLE` |
| `commitSha` | Full SHA verified in GitHub; short SHA is display-only |
| `environment` | `local`, `preview`, `staging`, `production`, `sandbox`, or `pilot` |

## 2. LETFON-authoritative G0–G12 taxonomy

The following names and order are authoritative for this repository. Older ST3.6
documents may use different labels; those labels are aliases and MUST NOT be
used to imply that a gate was passed.

| Gate | Canonical meaning | Minimum acceptance scope |
|---|---|---|
| G0 | Project opening and ownership | owner, sponsor, scope, risk owner, repository and start decision |
| G1 | Need and customer problem | verified problem, target user and demand evidence |
| G2 | Feasibility and founding models | business, product, technical, operating and risk models with tests |
| G3 | Scope, pilot and success contract | pilot scenarios, baseline, target, exit and stop criteria |
| G4 | Organization, budget and capacity | responsibility, budget, provider quotas and capacity limits |
| G5 | Architecture and security | architecture, threat model, secret boundary and security controls |
| G6 | API, data and workflow contracts | schemas, status, idempotency, checkpoint, audit and rollback contracts |
| G7 | End-to-end implementation | integrated application behavior across approved runtime components |
| G8 | Quality and security acceptance | required CI, tests, security, dependency and rollback evidence |
| G9 | Real pilot and measurable benefit | real pilot outcomes, baseline comparison, KPI and cost evidence |
| G10 | Technical publication | controlled release, deployment and technical rollback decision |
| G11 | Commercial or authorised internal use | sales/tax/payment or explicitly authorised internal-use acceptance |
| G12 | Sustainable operating acceptance | support, monitoring, restore, rollback, finance and signed acceptance |

**Legacy mapping rule:** if an older record calls G9 “provider acceptance”, G10
“pilot”, or G11 “release”, preserve the historical text but map the current
record to the table above and mark the mapping as `REVIEW` until independently
reconciled. No downstream gate may be closed from an unreconciled alias.

## 3. Source-state to canonical-state mapping

Implementation and external systems use different status vocabularies. The
evidence register stores only the canonical state in the right-hand column:

| Source state | Canonical evidence state | Rule |
|---|---|---|
| `TODO`, `PLANNED` | `PLANNED` | no implementation or evidence claim |
| `WORKING`, `IN_PROGRESS`, `ACTIVE` | `IN_PROGRESS` | work exists but acceptance is incomplete |
| `BLOCKED`, `NOT_RUN`, `CREDENTIAL_PENDING` | `BLOCKED` or `NOT_RUN` | preserve the exact blocker; never convert to PASS |
| `PASS`, `VERIFIED` | `VERIFIED` | technical evidence exists; independent acceptance may still be missing |
| `REVIEW`, `READY_FOR_REVIEW` | `PARTIAL` | evidence is assembled but review/Judge or dependencies remain |
| `CLOSED`, `ACCEPTED` | `ACCEPTED` only after the close gate below | never inferred from issue/PR closure |
| `FAILED`, `REJECTED`, `STALE` | `REJECTED` or `PARTIAL` | retain failure/staleness reason and next action |

## 4. Deployment traceability

Any row claiming preview, staging or production execution MUST record all of:

- deployment URL or provider deployment ID;
- deployed commit SHA, matching the evidence row’s full SHA;
- environment and timestamp in UTC;
- health/readiness result and the exact route or check;
- rollback target and owner.

If URL/ID or deployed SHA is absent, the deployment claim is `NOT_RUN` or
`BLOCKED`. A failed deployment quota, runner outage or provider outage is an
`infrastructure BLOCKED` record and is not a product regression.

## 5. Acceptance and closure gate

An evidence row can become `ACCEPTED` only when all applicable conditions are
true:

1. gate and canonical task mapping are unambiguous;
2. branch, PR and full commit SHA are verified in GitHub;
3. required CI/security/test results are recorded for that same SHA;
4. runtime/pilot/finance evidence matches the stated environment;
5. dependencies and rollback evidence are verified;
6. an independent reviewer or Judge has recorded the decision; and
7. required human approval is attributed and dated.

The actor who implemented the change cannot provide the independent final
approval. Missing or conflicting fields keep the row in `PARTIAL`, `REVIEW`,
`BLOCKED`, or `NOT_RUN`.

## 6. Reconciliation procedure

1. Read GitHub as the source of truth for branch, PR, SHA, CI and review.
2. Compare every evidence row to the exact current SHA.
3. Mark a mismatch `STALE`; do not rewrite historical evidence.
4. Record GitLab, Forgejo, local, preview and production results as secondary
   observations linked to the GitHub SHA.
5. Resolve taxonomy conflicts through this document and preserve the old label
   as a historical alias.
6. Run Judge and human approval checks before changing `PARTIAL` to `ACCEPTED`.

No secret, token, personal data, raw provider prompt, customer content or
payment credential may be stored in this register.
