# D01 — MauseAI Final Constitution & Operating Laws

## Executive Summary

This document defines the operating constitution, organizational structure, governance rules, and authority delegation for the MauseAI project. It serves as the ultimate authority for decision-making, task distribution, and quality assurance.

**Version**: 1.0  
**Date**: 2026-09-28  
**Status**: APPROVED  
**Next Review**: 2026-12-31  

---

## 1. Organizational Structure

### 1.1 Roles and Responsibilities

```
┌─────────────────────────────────────────────┐
│         Project Owner / Coordinator         │
│          (Hakim Çeliker / Human)            │
│   - Vision, strategy, go/no-go decisions    │
│   - Resource allocation                     │
│   - Risk acceptance                         │
└──────────┬──────────────────────────────────┘
           │
    ┌──────┴───────────────────┐
    │                          │
┌───▼────────────┐   ┌────────▼──────────┐
│ GPT / Codex    │   │ Claude (Reviewer) │
│ (Developer)    │   │ (Quality Gate)    │
│ - Code gen     │   │ - Arch review     │
│ - Task plan    │   │ - Security audit  │
│ - API design   │   │ - Diff review     │
└────────────────┘   │ - Risk assessment │
                     └───────────────────┘
```

### 1.2 Authority Levels

| Role | Decision Scope | Authority |
|---|---|---|
| **Owner** | Strategy, budget, go-live | Absolute |
| **GPT** | Technical execution | Delegated (within SLA) |
| **Claude** | Quality gates, risk veto | Delegated (blocking power) |
| **CI/CD** | Automated checks | No discretion |
| **External Tools** | Specialized functions | Read-only + events |

---

## 2. Core Operating Principles

### Principle 1: Separation of Concerns

Each component has a single responsibility:

```
┌─────────────────────────────────────────┐
│ Orchestrator (Task Coordinator)         │
│ - Accepts goals, breaks into tasks      │
│ - Selects tool, schedules, monitors     │
│ - Retries, checkpoints, costs           │
└─────────────────────────────────────────┘
        ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ GPT          │ │ Claude       │ │ External     │
│ (Reasoning)  │ │ (Review)     │ │ (Specialize) │
│ - Plan       │ │ - Audit      │ │ - Vision     │
│ - Reason     │ │ - Risk flag  │ │ - Data       │
│ - Code gen   │ │ - Approve    │ │ - Compute    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Principle 2: No Direct Handoff Without Record

Every task transition must be recorded:

```json
{
  "task_id": "MOUSE-NNN",
  "from_agent": "gpt",
  "to_agent": "claude",
  "timestamp": "2026-09-28T14:00:00Z",
  "status": "completed|blocked|needs_approval",
  "result": { ... },
  "evidence": [ "PR #42", "CI run link" ],
  "risks": [ "performance: +200ms p99" ],
  "next_action": "deploy to staging"
}
```

### Principle 3: Every Deploy is Audited

No code reaches production without:
- ✓ Author (GPT) + Reviewer (Claude) approval
- ✓ All CI checks green
- ✓ Audit log entry
- ✓ Deployment record

### Principle 4: Cost and Risk Visibility

Every operation has:
- Cost estimate (before) and actual (after)
- Risk assessment (security, performance, data loss)
- Approval from Owner if cost > threshold or risk > level

---

## 3. Task Lifecycle

### 3.1 Task States

```
Created → Assigned → In Progress → Review → Approved → Merged → Deployed → Closed

[blocked] ←─────────────────────────────────────────────────┘
```

### 3.2 Each State's Requirements

| State | Owner | Criteria |
|---|---|---|
| **Created** | Coordinator | Issue opened, MOUSE-NNN assigned |
| **Assigned** | GPT | Branch created, work started |
| **In Progress** | GPT | Code/doc written, local tests pass |
| **Review** | Claude | PR opened, CI triggered |
| **Approved** | Claude | All checks green, risk ≤ threshold |
| **Merged** | Coordinator | Commit on main, CI re-triggered |
| **Deployed** | Coordinator | Live in production |
| **Closed** | Coordinator | Delivery report written |

### 3.3 Blockers and Escalations

If any step fails:

```
Blocker → Create Issue "TASK-NNN blocked by X" 
        → Escalate to Owner for decision
        → Owner resolves or cancels task
```

---

## 4. Quality Gates

### 4.1 Code Quality

Every PR merge requires:

```
✓ npm run lint          — 0 errors
✓ npm run typecheck     — 0 errors (TypeScript)
✓ npm run test          — %80+ coverage, 0 failing
✓ npm run build         — Success
✓ npm audit             — 0 medium/high vulnerabilities
✓ Secret scan           — No exposed keys
✓ Claude review         — Approved
```

### 4.2 Documentation Quality

Every docs PR requires:

```
✓ Grammar and formatting (Markdown)
✓ Links resolve correctly
✓ Cross-references valid
✓ Completeness check (all sections required)
✓ Claude review (consistency, risk accuracy)
```

### 4.3 Risk Assessment

Every task assigned risk level:

| Level | Example | Approval |
|---|---|---|
| **L0** | Docs, comments, no impact | Auto |
| **L1** | Feature, internal tests | Claude |
| **L2** | User-facing, external API | Claude + Owner |
| **L3** | Deploy, data deletion | Owner explicit |

---

## 5. Communication Protocol

### 5.1 Task Communication

**From Owner to GPT:**
```markdown
TASK-001: Implement X

Goal: [What to build]
Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2

Resources: [Links, docs]
Due: [Date]
Risk level: [L0/L1/L2/L3]
Budget: [Cost estimate]
```

**From GPT to Claude (in PR):**
```markdown
## Changes
- Implemented X component
- Added tests (90% coverage)
- Updated docs

## Evidence
- Jest: ✓ 123 passing
- TypeScript: ✓ 0 errors
- Build: ✓ Success
```

**From Claude back to Owner (in review):**
```markdown
## Approved ✓
- Architecture sound
- Security OK (no RLS gaps)
- Performance OK (latency +5%)
- Ready to merge

## Concerns (non-blocking)
- Consider caching strategy for v2
```

### 5.2 Escalation Protocol

```
GPT blocked (unforeseen complexity)
    ↓
[TASK-NNN blocked by Y] issue created
    ↓
Claude reviews and flags risk
    ↓
Assigned to Owner for decision
    ↓
Owner: Approve extra time / Cancel / Pivot
```

---

## 6. Operational Rules (Regulatory)

### 6.1 Commit Rules

Every commit MUST:
- Reference TASK-NNN
- Use semantic message: `<type>(<scope>): <subject>`
- Include no secrets
- Have passing tests locally

```
feat(router): add GPT-Claude selector

Implements AI router that chooses between GPT and Claude
based on task type and cost budget.

Closes #42
Related to MOUSE-070

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SZAKusGjc8oqkHLFVzWJio
```

### 6.2 Branch Rules

Every branch MUST:
- Start from `main`
- Follow format: `feat/MOUSE-NNN-description`
- Be deleted after merge
- Never force-push to main

### 6.3 PR Rules

Every PR MUST:
- Have title: `MOUSE-NNN — [Description]`
- Link to TASK issue: `Closes #NNN`
- Pass all CI checks
- Have Claude approval
- Be squashed on merge (clean history)

### 6.4 Merge Rules

Merge to main ONLY if:
- ✓ All CI green
- ✓ Claude approved
- ✓ No conflicts
- ✓ All comments resolved
- ✓ Linked issue exists

### 6.5 Deploy Rules

Deploy to production ONLY if:
- ✓ Merged to main
- ✓ Post-merge CI passed
- ✓ Staging tested (manual)
- ✓ Owner approved
- ✓ Audit log ready

---

## 7. Data and Security

### 7.1 Secret Management

**RULE**: No secrets in code.

```
✗ NEVER: API key in .env or config.json
✓ ALWAYS: Use Vercel/Render environment panel
✓ ALWAYS: .env.local in .gitignore
✓ ALWAYS: Scan commits for exposed keys
```

### 7.2 Database Access

- Production DB: Service role keys only (backend)
- Frontend: Anon key (read-only via RLS)
- Backups: Encrypted, separate vault

### 7.3 Audit Logging

All these events logged:
- Deploy (when, who, what commit)
- Data access (user, time, scope)
- Cost (per task, per day)
- Errors (severity, resolution)

---

## 8. Performance and Cost

### 8.1 Cost Tracking

Every task has:
- Estimated cost (before)
- Actual cost (after)
- Cost threshold (fail if exceeded)

```json
{
  "task_id": "MOUSE-050",
  "cost_estimate": "$0.50",
  "cost_actual": "$0.45",
  "cost_threshold": "$1.00",
  "status": "within budget"
}
```

### 8.2 Performance SLAs

| Component | Target | Measurement |
|---|---|---|
| API latency (p99) | <500ms | CloudFlare metrics |
| Database query (p99) | <50ms | Supabase metrics |
| Page load (p95) | <2s | Core Web Vitals |
| Error rate | <0.1% | Sentry |
| Uptime | >99.9% | Status page |

### 8.3 Cost Budget

- **Monthly limit**: [TBD by Owner]
- **Per-task threshold**: [TBD by Owner]
- **Overages**: Escalation to Owner

---

## 9. Change Control Process

### 9.1 Architecture Changes

Any of these requires RFC (Request for Comment):
- New major dependency
- Database schema break
- API contract change
- Deployment topology change

RFC Process:
```
1. Author drafts RFC (markdown)
2. Circulate to Claude + Owner (review window: 3 days)
3. Collect feedback in comments
4. Author revises
5. Owner approves or rejects
6. If approved: proceed as TASK-NNN
```

### 9.2 Policy Changes

Any of these requires Policy PR:
- This constitution (D01)
- Standards (D12-D20)
- Runbooks

Policy PR:
```
- Branch: `docs/MOUSE-NNN-policy-update`
- PR title: `POLICY: [Change]`
- Approval: Owner + Claude (both must ✓)
- Merge: Squashed, tagged in CHANGELOG
```

### 9.3 Emergency Changes

If production is down and cannot wait:

```
1. Owner declares emergency: "PRODUCTION_DOWN"
2. GPT writes hotfix on `hotfix/MOUSE-NNN-*`
3. Claude fast-track review (30 min)
4. Owner approves
5. Deploy
6. Post-mortem in 24 hours
```

---

## 10. Governance and Disputes

### 10.1 Decision Authority

| Decision | Authority | Appeal |
|---|---|---|
| Technical detail | GPT | Claude review |
| Code review | Claude | Owner arbitrates |
| Risk acceptance | Owner | N/A |
| Policy change | Owner + Claude | N/A |
| Budget | Owner | N/A |

### 10.2 Dispute Resolution

**Scenario**: Claude rejects PR; GPT disagrees

```
1. Both add comments with reasoning
2. If unresolved after 2 rounds: Owner decides
3. Owner decision is final
4. Document in GitHub issue for future reference
```

### 10.3 Post-Incident Review

After any incident (prod down, data loss, security breach):

```
1. Create issue: "POST-MORTEM: [Incident]"
2. Timeline: what happened, when, impact
3. Root cause: why did it happen?
4. Remediation: what was fixed?
5. Prevention: what process changes?
6. Owner signs off on prevention plan
```

---

## 11. Handoff and Transition

### 11.1 New Developer Onboarding

New developer reads in order:
1. This Constitution (D01)
2. Task ID Standard (D12)
3. Phase Naming (PHASE-NAMING-STANDARD.md)
4. PR & CI Rules (PR-CI-RULES.md)
5. Secret Law (SECRET-LAW.md)
6. File Ownership (FILE-OWNERSHIP.md)
7. Codebase README

Then:
- Set up local dev env
- Run: `npm run setup`
- Create first PR under mentorship

### 11.2 Knowledge Handoff

When GPT → Claude or vice versa:

```
Required handoff packet:
- Task ID (MOUSE-NNN)
- Goal statement
- Current state (PR link, branch, commit)
- Key decisions made
- Blockers or risks
- Next steps
- Test results / evidence
```

---

## 12. Sunset and Archival

### 12.1 Task Closure

Task is closed when:
- ✓ Merged to main
- ✓ Deployed to production
- ✓ Delivery report written
- ✓ Issue closed with summary

### 12.2 Old Documents

Documents > 6 months old:
- Move to `docs/archive/`
- Add deprecation notice
- Link to new document
- Keep for historical reference

---

## 13. Appendices

### Appendix A: Risk Matrix

```
┌─────┬─────────────────────┐
│Risk │ Mitigation          │
├─────┼─────────────────────┤
│L0   │ Auto approve        │
│L1   │ Claude review       │
│L2   │ Claude + Owner      │
│L3   │ Emergency protocol  │
└─────┴─────────────────────┘
```

### Appendix B: Cost Tracking

```json
{
  "task_id": "MOUSE-020",
  "phase": "Faz 1: Repository Skeleton",
  "cost_breakdown": {
    "gpt_tokens": { "input": 50000, "output": 25000, "cost": "$0.30" },
    "compute": { "ci_minutes": 10, "cost": "$0.10" },
    "total": "$0.40"
  }
}
```

### Appendix C: Authority Delegation Matrix

| Authority | GPT | Claude | Owner | External |
|---|---|---|---|---|
| Code write | ✓ | ✗ | ✗ | ✗ |
| Code merge | ✗ | ✓ | ✓ | ✗ |
| Deploy | ✗ | ✗ | ✓ | ✗ |
| Policy change | ✗ | ✓ | ✓ | ✗ |
| Budget override | ✗ | ✗ | ✓ | ✗ |

---

## 14. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-09-28 | GPT + Claude | Initial constitution |

---

## 15. Related Documents

- [D12 - Task Registry](./D12-task-registry.md)
- [D13 - Change Control](./D13-change-control.md)
- [D14 - AI Tool Role Matrix](./D14-ai-tool-role-matrix.md)
- [D15 - GPT-Claude Separation](./D15-gpt-claude-separation.md)
- [D20 - AI Task Authority Law](./D20-ai-task-authority-law.md)
- [TASK-ID-STANDARD](./standards/TASK-ID-STANDARD.md)
- [PHASE-NAMING-STANDARD](./standards/PHASE-NAMING-STANDARD.md)
- [FILE-OWNERSHIP](./standards/FILE-OWNERSHIP.md)
- [PR-CI-RULES](./standards/PR-CI-RULES.md)
- [SECRET-LAW](./standards/SECRET-LAW.md)

---

**Approved by**: Hakim Çeliker (Project Owner)  
**Effective Date**: 2026-09-28  
**Last Updated**: 2026-09-28  

This document is binding on all contributors. Changes require RFC and Owner approval.
