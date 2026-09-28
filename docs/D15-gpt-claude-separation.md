# D15 — GPT and Claude Separation of Concerns

**Version**: 1.0  
**Date**: 2026-09-28  
**Authority**: D01 - Final Constitution  
**Related**: D14 - AI Tool Role Matrix  

---

## 1. Executive Summary

GPT and Claude have distinct roles in MauseAI:

```
GPT    → Generation, planning, execution, code production
Claude → Review, audit, risk assessment, approval gates
```

This document defines the boundary between them to prevent:
- Duplicate work
- Conflicting decisions
- Missing oversight

---

## 2. GPT Responsibilities

### 2.1 Planning and Task Breakdown

**GPT does**: Convert user goal into structured task plan

```
Input:  "I want to accept customer emails"
Output: 
  - Task 1: Email adapter (parse, normalize)
  - Task 2: Email classifier (sales/support/etc.)
  - Task 3: Conversation create (store in DB)
  - Task 4: GPT response draft (in queue)
  - Task 5: Approval workflow
```

### 2.2 Code Generation

**GPT does**: Write production code

```
Scope:
✓ src/ files
✓ API endpoints
✓ Database migrations
✓ Helper functions
✓ Test cases (unit and integration)
✓ Configuration files

Does NOT:
✗ Merge to main (PR only)
✗ Approve own code (Claude approval required)
✗ Deploy to production (Owner decision)
✗ Make architectural decisions alone
```

### 2.3 API Design

**GPT does**: Draft API contracts

```
✓ OpenAPI/JSON schema
✓ Request/response formats
✓ Error codes and messages
✓ Rate limiting, auth requirements

✗ Does NOT final-decide if archi risk exists
  (Claude review required for risks)
```

### 2.4 Documentation

**GPT does**: First draft of technical docs

```
✓ README sections
✓ API documentation
✓ Setup guides
✓ Troubleshooting

✗ Does NOT approve policy docs (D01-D20)
  (Claude + Owner approval required)
```

### 2.5 Testing

**GPT does**: Write test cases

```
✓ Unit tests (Jest)
✓ Integration tests
✓ Happy path and sad path scenarios
✓ Edge case coverage
✓ Performance benchmarks

Does NOT:
✗ Make final decision on coverage %
  (Claude may require more tests)
```

### 2.6 Estimation

**GPT does**: Estimate task complexity

```
Provides:
✓ Effort estimate (hours)
✓ Complexity rating (small/medium/large)
✓ Dependencies identified
✓ Risk flags (need external input)

Does NOT:
✗ Make go/no-go decision
  (Owner decides)
```

---

## 3. Claude Responsibilities

### 3.1 Code Review (Diff Review)

**Claude does**: Examine every PR diff

```
Checks:
✓ Does code match design intent?
✓ Are there security gaps?
  - SQL injection?
  - Exposed secrets?
  - RLS policy bypasses?
✓ Is error handling complete?
✓ Are types correct (TypeScript)?
✓ Is test coverage sufficient?
✓ Does code follow project conventions?
✓ Performance implications?
✓ Maintainability concerns?
```

### 3.2 Architectural Audit

**Claude does**: Review for design consistency

```
Questions:
✓ Does this fit the orchestrator pattern?
✓ Are domain contracts used correctly?
✓ Does cost tracking work end-to-end?
✓ Is this aligned with D01-D20?
✓ Breaking changes properly handled?
```

### 3.3 Risk Assessment

**Claude does**: Flag risks before they become problems

```
Examples:
✓ "This database query is O(n), could be slow with 10k rows"
✓ "JWT expiry might cause session issues for long-running tasks"
✓ "No fallback if Inngest API is down"
✓ "This RLS policy could leak user data if not careful"
```

### 3.4 Security Audit

**Claude does**: Check for security issues

```
Deep dives:
✓ Are secrets hardcoded? (blocking)
✓ API keys leaked in logs? (blocking)
✓ RLS policies correct? (blocking)
✓ SQL injection possible? (blocking)
✓ Authentication gaps? (blocking)
✓ CSRF / SSRF / XXE risks?
✓ Rate limiting present?
✓ Audit logging in place?
```

### 3.5 Approval and Merge

**Claude does**: Make go/no-go decision on PR

```
States:
✓ APPROVED — Merge ready
✓ APPROVED WITH CONCERNS — Minor issues, merge OK
✗ CHANGES REQUESTED — Must fix before merge
```

### 3.6 Large Document Review

**Claude does**: Analyze long technical docs

```
Examples:
✓ Review 50-page architecture doc
✓ Compare implementation vs. RFC
✓ Find inconsistencies across docs
✓ Check for missing edge cases
✓ Risk and compliance assessment
```

### 3.7 Runbook and Operational Docs

**Claude does**: Refine operational procedures

```
Ensures:
✓ Steps are correct and complete
✓ Error scenarios handled
✓ Escalation paths clear
✓ Recovery procedures tested
✓ RTO/RPO targets feasible
```

---

## 4. Shared Responsibilities

### 4.1 Documentation (D01-D20)

```
GPT:    Draft structure, write content
Claude: Review for consistency, completeness, risk accuracy
Owner:  Final approval
→ Merge: Squashed
```

### 4.2 Operational Runbooks

```
GPT:    First draft of procedures
Claude: Audit and refine
→ Merge: Reviewed
```

### 4.3 Decision Records (ADRs)

```
GPT:    "Why did we choose Inngest over Temporal?"
Claude: "Is this reasoning sound? Risks captured?"
→ Merge: Approved
```

### 4.4 Post-Mortems

```
GPT:    Collects facts and timeline
Claude: Analyzes root cause and prevention
Owner:  Accepts prevention plan
→ Merge: To incidents/ archive
```

---

## 5. Decision-Making

### 5.1 Who Decides What

| Decision | Authority |
|---|---|
| Write code for feature X | GPT |
| Approve code for feature X | Claude |
| Reject PR due to architecture risk | Claude (blocking) |
| Go live to production | Owner |
| Change project policy (D01) | Owner + Claude |
| Allocate budget for new service | Owner |
| Emergency rollback | Owner (Claude consulted) |

### 5.2 Disagreement Protocol

**Scenario**: Claude rejects PR; GPT wants to push back

```
1. GPT comments: "I disagree because..."
   Claude responds: "Fair point, but..."

2. If still unresolved after 2 rounds:
   Escalate to Owner for arbitration

3. Owner decides (final call)

4. Document reasoning in GitHub for future reference
```

### 5.3 Claude Cannot Veto

Claude can flag concerns but cannot:
- ✗ Veto Owner's decision on go-live
- ✗ Require infinite perfection (diminishing returns)
- ✗ Delay indefinitely without clear blocker

Claude can propose:
- ✓ "Consider this redesign"
- ✓ "This is risky; recommend further testing"
- ✓ "This violates D13; requires RFC"

---

## 6. Workflow Examples

### 6.1 Feature Development

```
1. Owner assigns MOUSE-NNN to GPT: "Implement AI router"

2. GPT:
   - Reads acceptance criteria
   - Drafts design
   - Writes code (250 lines)
   - Writes tests (120 lines, 85% coverage)
   - Runs locally: ✓ All green
   - Opens PR #42

3. GitHub CI:
   - lint: ✓
   - typecheck: ✓
   - test: ✓ 45 passing
   - audit: ✓ no vulns
   - build: ✓

4. Claude:
   - Reads design and code
   - Checks for risks:
     ✗ "This fallback doesn't work if both APIs down"
     → Comment: "Please add circuit breaker"
   - Flag: CHANGES REQUESTED

5. GPT:
   - Reads feedback
   - Updates code
   - Adds circuit breaker (30 lines)
   - Adds test for circuit breaker
   - Commits new change
   - Pushes to same PR

6. Claude (re-review):
   - ✓ Circuit breaker looks good
   - ✓ Tests comprehensive
   - ✓ Approved

7. Owner:
   - ✓ Merge

8. Post-merge:
   - Deploy to staging
   - E2E tests: ✓
   - Owner approves production deploy
   - Live ✓
```

### 6.2 Documentation Review

```
1. GPT writes D12 (Task Registry) draft
   - 500 lines
   - Structure: Clear
   - Content: Technical accurate
   - Formatting: Markdown good

2. Claude reviews:
   - ✓ Structure makes sense
   - ✓ All examples clear
   - ✗ Missing: How to handle blocked tasks?
   - ✗ Missing: Version history
   - Comment: "Add section 9: Blocking Rules"

3. GPT updates:
   - Adds section 9
   - Adds versioning table
   - Pushes

4. Claude re-checks:
   - ✓ Approved

5. Owner:
   - ✓ Final sign-off
   - Merge
```

### 6.3 Security Issue

```
1. Claude detects in code review:
   ✗ "Database connection string might be logged"

2. GPT:
   - Adds `sanitize()` wrapper
   - Adds test: "Verify connection string not in logs"
   - Commits

3. Claude:
   - Verifies fix
   - ✓ Approved

4. Merge + Deploy
```

---

## 7. Collaboration Norms

### 7.1 Communication Style

**Claude to GPT**:
- Constructive, specific feedback
- "Line 45: This could cause O(n²) complexity"
- Not: "This is bad code"

**GPT to Claude**:
- Respectful disagreement allowed
- "I understand the concern, but..."
- Follow-up questions OK

### 7.2 Response Time SLA

| Request | SLA |
|---|---|
| PR needs review | 4 hours (Claude) |
| GPT follow-up | 4 hours |
| Approval → Merge | 1 hour (Owner) |

### 7.3 Async-Friendly

Both can work asynchronously:
- PR sits for review overnight? OK
- GPT waits for Claude feedback? Post questions meanwhile
- No meetings required (use GitHub comments)

---

## 8. Anti-Patterns (What NOT to Do)

### 8.1 GPT Anti-Patterns

```
✗ Merge own PR without review
✗ Write without tests
✗ Hardcode secrets
✗ Ignore Claude feedback
✗ Change policy (D01-D20) unilaterally
✗ Deploy to production manually
✗ Skip RFC for architectural changes
```

### 8.2 Claude Anti-Patterns

```
✗ Approve without actually reading code
✗ Require perfection (100% coverage, zero risk)
✗ Change code directly (only review)
✗ Make architectural decisions alone
✗ Delay merge indefinitely
✗ Reject without constructive feedback
```

### 8.3 Owner Anti-Patterns

```
✗ Skip Claude review due to time pressure
✗ Make technical decisions without GPT input
✗ Override policy without documentation
✗ Accept unlimited risk in name of speed
```

---

## 9. Escalation Path

```
Problem
  ↓
Can GPT + Claude resolve? → Yes → Solve together
  ↓ No
Escalate to Owner
  ↓
Owner decides
  ↓
Document in GitHub for future reference
```

---

## 10. Evolution

This separation can be adjusted:

```
If Claude is doing too much code writing:
  → Rebalance: GPT takes more complex features

If GPT ignores Claude feedback:
  → Feedback session, update norms, possibly require pre-approval

If Owner feels out of loop:
  → Add daily standup or weekly sync

Update this D15 when role boundaries shift.
```

---

## 11. Related Documents

- [D01 - Final Constitution](./D01-final-constitution.md)
- [D14 - AI Tool Role Matrix](./D14-ai-tool-role-matrix.md)
- [D20 - AI Task Authority Law](./D20-ai-task-authority-law.md)
- [PR-CI-RULES](./standards/PR-CI-RULES.md)

---

**Version**: 1.0  
**Effective**: 2026-09-28  
**Review Date**: 2026-12-28  

This document will be reviewed quarterly and updated as role definitions evolve.
