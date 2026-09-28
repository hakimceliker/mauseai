# D12 — MauseAI Task Registry

**Status**: Central Registry  
**Last Updated**: 2026-09-28  
**Owner**: Project Coordinator  
**Authority**: D01 - Final Constitution  

---

## Purpose

The Task Registry maintains a complete record of every MOUSE-NNN task:
- Unique task ID
- Assignment and completion
- Dependencies (blocked by, blocks)
- Evidence (PR, CI run, deployment)
- Risks and outcomes

This ensures traceability, accountability, and knowledge preservation.

---

## Task States

```
[Created] → [Assigned] → [In Progress] → [Ready for Review] → [Approved] → [Merged] → [Deployed] → [Closed]
                                                                                                    ↑
                                                [Blocked] ←─────────────────────────────────────┘
```

### State Definitions

| State | Owner | Definition |
|---|---|---|
| **Created** | Coordinator | Issue opened, MOUSE-NNN assigned, no work started |
| **Assigned** | GPT | Developer claims task, creates branch |
| **In Progress** | GPT | Code/docs written, local tests pass |
| **Ready for Review** | GPT | PR opened, CI triggered, awaiting review |
| **Approved** | Claude | All checks green, risks accepted, ready to merge |
| **Merged** | Coordinator | Commit on main, post-merge CI run |
| **Deployed** | Coordinator | Live in staging or production |
| **Closed** | Coordinator | Delivery report written, issue closed |
| **Blocked** | Coordinator | Waiting on external dependency, escalated |

---

## Central Task List

### Aşama 0: Merkezi Hazırlık (Central Preparation)

| ID | Görev | Sahip | Durum | PR | Teslim |
|---|---|---|---|---|---|
| **MOUSE-001** | Central Prep Docs | GPT + Claude | In Progress | stage/0 | Evidence/STAGE-0-CENTRAL-PREP.md |
| **MOUSE-002** | Constitution Review | Claude | Ready | PR #TBD | Issue #TBD |
| **MOUSE-003** | Standards Approval | Owner | Pending | N/A | Sign-off |
| **MOUSE-004** | CI/CD Setup | GPT | TODO | N/A | N/A |
| **MOUSE-005** | Runbook Template | GPT + Claude | TODO | N/A | N/A |
| **MOUSE-006** | Cost Tracking Setup | GPT | TODO | N/A | N/A |
| **MOUSE-007** | Secret Rotation Policy | GPT + Claude | TODO | N/A | N/A |
| **MOUSE-008** | GitHub Labels & Milestones | GPT | TODO | N/A | N/A |
| **MOUSE-009** | Developer Onboarding Doc | GPT + Claude | TODO | N/A | N/A |
| **MOUSE-010** | Aşama 1 Planning | Coordinator | TODO | N/A | N/A |

---

### Aşama 1: Temel Kurulum (Foundation) — 14 Faz

#### Faz 0: MVP Setup

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-011** | CI/CD Pipelines | GPT | Ready | feature/faz-0-ci-cd | #TBD |
| **MOUSE-012** | Logging & Monitoring | GPT | Ready | feature/faz-0-logging | #TBD |
| **MOUSE-013** | Health Checks | GPT | Ready | feature/faz-0-health | #TBD |
| **MOUSE-014** | Deployment Strategy | GPT + Claude | Ready | feature/faz-0-deploy | #TBD |
| **MOUSE-015** | Documentation Base | GPT + Claude | Ready | feature/faz-0-docs | #TBD |

#### Faz 1: Repository Skeleton

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-020** | Repo Structure | GPT | Merged | feature/faz-1-repo-skeleton | #TBD |
| **MOUSE-021** | Dependencies & Lockfile | GPT | Merged | feature/faz-1-repo-skeleton | #TBD |
| **MOUSE-022** | Environment Config | GPT | Merged | feature/faz-1-repo-skeleton | #TBD |
| **MOUSE-023** | Git Hooks & Pre-commit | GPT | Merged | feature/faz-1-repo-skeleton | #TBD |

#### Faz 2: Domain Contracts

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-030** | Task Model | GPT | Merged | feature/faz-2-domain-contracts | #TBD |
| **MOUSE-031** | Conversation Model | GPT | Merged | feature/faz-2-domain-contracts | #TBD |
| **MOUSE-032** | Offer Model | GPT | Merged | feature/faz-2-domain-contracts | #TBD |
| **MOUSE-033** | Cost Model | GPT | Merged | feature/faz-2-domain-contracts | #TBD |

#### Faz 3: Task API

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-040** | Task CRUD | GPT | TODO | feature/faz-3-task-api | TBD |
| **MOUSE-041** | Task Status API | GPT | TODO | feature/faz-3-task-api | TBD |
| **MOUSE-042** | Task Cancellation | GPT | TODO | feature/faz-3-task-api | TBD |

#### Faz 4: Database Schema

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-050** | Supabase Setup | GPT | TODO | feature/faz-4-database-schema | TBD |
| **MOUSE-051** | Migration System | GPT | TODO | feature/faz-4-database-schema | TBD |
| **MOUSE-052** | RLS Policies | GPT | TODO | feature/faz-4-database-schema | TBD |

#### Faz 5: Inngest Worker

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-060** | Inngest Setup | GPT | TODO | feature/faz-5-inngest-worker | TBD |
| **MOUSE-061** | Event Schema | GPT | TODO | feature/faz-5-inngest-worker | TBD |
| **MOUSE-062** | Worker Functions | GPT | TODO | feature/faz-5-inngest-worker | TBD |

#### Faz 6: Retry & Idempotency

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-070** | Idempotency Keys | GPT | TODO | feature/faz-6-retry-idempotency | TBD |
| **MOUSE-071** | Circuit Breaker | GPT | TODO | feature/faz-6-retry-idempotency | TBD |
| **MOUSE-072** | Exponential Backoff | GPT | TODO | feature/faz-6-retry-idempotency | TBD |

#### Faz 7: AI Router

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-080** | GPT-Claude Selector | GPT | TODO | feature/faz-7-ai-router | TBD |
| **MOUSE-081** | Fallback Strategy | GPT | TODO | feature/faz-7-ai-router | TBD |
| **MOUSE-082** | Cost Optimization | GPT | TODO | feature/faz-7-ai-router | TBD |

#### Faz 8: Cost Tracking

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-090** | Meter Setup | GPT | TODO | feature/faz-8-cost-tracking | TBD |
| **MOUSE-091** | Cost Recording | GPT | TODO | feature/faz-8-cost-tracking | TBD |
| **MOUSE-092** | Budget Limits | GPT | TODO | feature/faz-8-cost-tracking | TBD |

#### Faz 9: Webhooks & Callbacks

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-100** | Webhook Handler | GPT | TODO | feature/faz-9-webhooks | TBD |
| **MOUSE-101** | Callback Schema | GPT | TODO | feature/faz-9-webhooks | TBD |

#### Faz 10: Conversations

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-110** | Conversation CRUD | GPT | TODO | feature/faz-10-conversations | TBD |
| **MOUSE-111** | Message Streaming | GPT | TODO | feature/faz-10-conversations | TBD |
| **MOUSE-112** | Context Windows | GPT | TODO | feature/faz-10-conversations | TBD |

#### Faz 11: Offers & Pricing

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-120** | Offer Engine | GPT | TODO | feature/faz-11-offers | TBD |
| **MOUSE-121** | Pricing Rules | GPT | TODO | feature/faz-11-offers | TBD |
| **MOUSE-122** | Discount Logic | GPT | TODO | feature/faz-11-offers | TBD |

#### Faz 12: Auth & RLS

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-130** | JWT Setup | GPT | TODO | feature/faz-12-auth-rls | TBD |
| **MOUSE-131** | Session Management | GPT | TODO | feature/faz-12-auth-rls | TBD |
| **MOUSE-132** | RLS Enforcement | GPT | TODO | feature/faz-12-auth-rls | TBD |

#### Faz 13: E2E Tests

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-140** | Test Framework Setup | GPT | TODO | feature/faz-13-e2e-tests | TBD |
| **MOUSE-141** | Critical Paths | GPT | TODO | feature/faz-13-e2e-tests | TBD |
| **MOUSE-142** | Performance Tests | GPT | TODO | feature/faz-13-e2e-tests | TBD |

#### Faz 14: Demo UI

| ID | Görev | Sahip | Durum | Branch | PR |
|---|---|---|---|---|---|
| **MOUSE-150** | Next.js UI Setup | GPT | TODO | feature/faz-14-demo-ui | TBD |
| **MOUSE-151** | Customer Portal | GPT | TODO | feature/faz-14-demo-ui | TBD |
| **MOUSE-152** | Dashboard | GPT | TODO | feature/faz-14-demo-ui | TBD |

---

## Task Entry Template

Every new MOUSE-NNN task gets this record:

```json
{
  "task_id": "MOUSE-NNN",
  "title": "Task Title",
  "description": "One-liner description",
  "phase": "Aşama N, Faz M",
  "assigned_to": "gpt|claude|owner|external",
  "status": "created|assigned|in_progress|ready_for_review|approved|merged|deployed|closed|blocked",
  "created_at": "2026-09-28T00:00:00Z",
  "started_at": null,
  "completed_at": null,
  "issue_number": 123,
  "branch_name": "feat/MOUSE-NNN-short-name",
  "pr_number": 42,
  "pr_url": "https://github.com/hakimceliker/mauseai/pull/42",
  "ci_run": "https://github.com/hakimceliker/mauseai/actions/runs/...",
  "deployment_url": "https://staging.mauseai.com/...",
  "risk_level": "L0|L1|L2|L3",
  "cost_estimate": "$0.50",
  "cost_actual": "$0.45",
  "cost_threshold": "$1.00",
  "dependencies": {
    "blocked_by": ["MOUSE-119"],
    "blocks": ["MOUSE-121"]
  },
  "deliverables": [
    "src/module/file.ts",
    "test/module/file.test.ts",
    "docs/D12-task-registry.md"
  ],
  "evidence": {
    "pr": "https://github.com/hakimceliker/mauseai/pull/42",
    "ci": "https://github.com/hakimceliker/mauseai/actions/runs/...",
    "deployment": "Production commit abc123",
    "tests": "Jest: 50 passing, 0 failing",
    "coverage": "85%"
  },
  "risks": [
    "Performance: +50ms latency on task creation",
    "Data migration: Requires downtime"
  ],
  "blockers": [
    "Waiting on MOUSE-119 completion",
    "Need Owner approval for budget increase"
  ],
  "notes": "...",
  "reviewer": "claude",
  "reviewer_comments": "Architecture approved, tests comprehensive."
}
```

---

## Task Lifecycle Example

### MOUSE-080: GPT-Claude AI Router

```
1. Created [2026-10-01T10:00Z]
   Issue: #123 "MOUSE-080: Implement AI Router"
   Coordinator creates, labels as "stage/1" "phase/7"

2. Assigned [2026-10-01T10:30Z]
   GPT starts work
   Branch: feature/faz-7-ai-router
   PR: Not yet

3. In Progress [2026-10-02T14:00Z]
   Code written: 300 lines
   Tests: 45 test cases
   Local tests: ✓ Passing

4. Ready for Review [2026-10-03T09:00Z]
   PR #42 opened: "MOUSE-080 — AI Router Implementation"
   CI triggered: lint, typecheck, test, build, audit
   Claude notified

5. Approved [2026-10-03T11:30Z]
   Claude review: ✓ Approved
   Comments: "Architecture solid, consider caching in v2"
   All CI: ✓ Green
   Coverage: 87%

6. Merged [2026-10-03T12:00Z]
   Squashed commit: feat(router): add GPT-Claude selector
   Main branch updated
   Post-merge CI: ✓ Passed

7. Deployed [2026-10-03T14:00Z]
   Deployed to staging
   E2E tests: ✓ Passed
   Owner approval: ✓
   Deployed to production

8. Closed [2026-10-04T10:00Z]
   Delivery report written
   Issue closed
   Registry updated with evidence
```

---

## Dependencies and Blocking Rules

### Dependency Map

```
MOUSE-020 (Repo Skeleton) ← Foundation
    ↓
MOUSE-030 (Domain Contracts) ← Must follow
    ↓
MOUSE-040 (Task API) ← Depends on contracts
MOUSE-050 (DB Schema) ← Parallel
    ↓ ↓
MOUSE-060 (Inngest) ← Parallel
    ↓
MOUSE-080 (AI Router) ← Integration point
    ↓
MOUSE-090 (Cost Tracking) ← Depends on router
    ↓
All Faz → MOUSE-140 (E2E Tests)
    ↓
MOUSE-150 (Demo UI) ← Final integration
```

### Blocking Rules

```
If Task A blocks Task B:
  - B cannot merge until A is merged
  - B PR status shows "blocked by A (#PR-number)"
  - Coordinator monitors dependencies

If Task A is blocked by B:
  - A's issue has "blocked-by-MOUSE-NNN" label
  - A's progress paused
  - Alert to Owner if timeline at risk
```

---

## Escalation

### Blocked Task Protocol

If a task cannot proceed:

```
1. Developer flags: "BLOCKED: Reason"
2. Comment on GitHub issue
3. Label: "status/blocked"
4. Coordinator notified
5. Owner decides: Unblock / Cancel / Pivot
6. Update Registry
```

Example:

```
MOUSE-060 BLOCKED: Waiting on Inngest API docs

Reason: Inngest team didn't respond to integration questions.

Unblocked by: MOUSE-065 (Temporal migration) - Owner approved pivot
```

---

## Closure Criteria

Task is **Ready to Close** when:
- ✓ PR merged to main
- ✓ Deployed to production (or staging, if applicable)
- ✓ All acceptance criteria met
- ✓ Delivery report written
- ✓ Evidence links included
- ✓ Risks documented
- ✓ Next task clearly defined

---

## Registry Maintenance

### Weekly Update
- Remove "In Progress" tasks stuck >5 days
- Escalate blockers
- Update cost actuals

### Monthly Audit
- Review all closed tasks
- Measure accuracy of estimates
- Update phase projections

### Quarterly Archive
- Move completed phases to `docs/archive/`
- Preserve evidence links
- Create summary report

---

## Related Documents

- [D01 - Final Constitution](./D01-final-constitution.md)
- [TASK-ID-STANDARD](./standards/TASK-ID-STANDARD.md)
- [PHASE-NAMING-STANDARD](./standards/PHASE-NAMING-STANDARD.md)
- [PR-CI-RULES](./standards/PR-CI-RULES.md)
- [DELIVERY-TEMPLATE](./DELIVERY-TEMPLATE.md)

---

**Owner**: Project Coordinator  
**Last Updated**: 2026-09-28  
**Next Review**: 2026-10-15  
