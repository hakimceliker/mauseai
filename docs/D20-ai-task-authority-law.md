# D20 — AI Task Authority and Responsibility Law

**Date**: 2026-09-28  
**Authority**: D01 - Final Constitution  
**Governed by**: D14 - AI Tool Role Matrix, D15 - GPT-Claude Separation  

---

## 1. The Core Law

```
Every autonomous action by an AI tool (GPT or Claude) 
MUST have explicit human authority and MUST be recorded 
in the task system.
```

### Principle: No Surprise Deployments

Machines execute. Humans decide.

---

## 2. Authority Hierarchy

```
User / Owner (highest authority)
    ↓ Delegates to
Coordinator / Project Manager
    ↓ Delegates to
GPT (Executor)
    ↓ Monitored by
Claude (Quality Gate)
    ↓ Oversight by
Orchestrator (Audit Log)
```

### Delegation Rules

- Owner cannot delegate away approval authority
- GPT can execute, but not approve
- Claude can veto, but not execute unilaterally
- Orchestrator records everything

---

## 3. What Requires Human Authority

### 3.1 Pre-Execution Authority

**REQUIRE explicit human approval before**:

| Action | Who Approves | Evidence |
|---|---|---|
| **Major feature** (>5 days work) | Owner | GitHub issue label |
| **API breaking change** | Owner + Claude | RFC + approval |
| **Deployment to production** | Owner | Signed deploy command |
| **Budget increase** | Owner | Issue + approval |
| **Policy change** (D01-D20) | Owner + Claude | Policy PR approval |
| **Database schema change** | Owner + DBA | Migration review |
| **Emergency rollback** | Owner | Emergency declaration |
| **Key rotation** | Ops | Checklist completion |
| **Data deletion** | Owner + Legal | Written request |
| **Third-party integration** | Owner | Contract review |

### 3.2 Post-Execution Authority

**REQUIRE human sign-off after**:

| Action | Who Signs | Evidence |
|---|---|---|
| **Code merge to main** | Claude (tech) | PR approval |
| **Deployment success** | Coordinator | Deployment ticket |
| **Test coverage** | Claude | %80+ threshold met |
| **Security scan** | Claude | Zero high-severity findings |
| **Audit trail** | Coordinator | Log entry reviewed |

---

## 4. Task Authority Matrix

| Tool | Can Execute | Can Approve | Can Veto | Can Override |
|---|---|---|---|---|
| **GPT** | ✓ Code/docs | ✗ | ✗ | ✗ |
| **Claude** | ✗ | ✓ Code only | ✓ Risk | ✗ |
| **Owner** | ✗ | ✓ All | ✓ All | ✓ All |
| **CI/CD** | ✓ Automated | ✓ Checks | ✓ Failure | ✗ |
| **Supabase** | Read/Write (RLS) | ✗ | ✗ | Owner only |

### Interpretation

- **Can Execute**: Can write code and commit
- **Can Approve**: Can merge to main / approve PR
- **Can Veto**: Can block / reject PR
- **Can Override**: Can force-push or make unilateral decision

---

## 5. Task Lifecycle Authority

### State: Created

```
WHO: Coordinator (Owner via GitHub issue)
AUTHORITY: Issue creation, task assignment
RECORD: GitHub issue + MOUSE-NNN
PROOF: Issue URL
```

### State: In Progress

```
WHO: GPT (developer)
AUTHORITY: Code generation, local testing
BOUNDARY: Cannot merge to main without approval
RECORD: Branch, commits, local test results
PROOF: git log, test output
```

### State: PR Ready

```
WHO: GPT (opens PR)
AUTHORITY: Cannot approve own work
TRIGGER: CI/CD runs automatically
RECORD: PR #NNN, CI run log
PROOF: GitHub PR status
```

### State: Code Review

```
WHO: Claude (reviewer)
AUTHORITY: Can approve or request changes
OPTIONS:
  ✓ APPROVED — Merge eligible
  ⚠ APPROVED WITH CONCERNS — Merge OK but note risks
  ✗ CHANGES REQUESTED — Must fix before merge
RECORD: PR comments, approval decision
PROOF: GitHub PR review
```

### State: Approved

```
WHO: Claude (approval recorded)
AUTHORITY: Ready to merge (but requires merge authority)
REQUIREMENT: All CI checks green
RECORD: Approval timestamp, final check results
PROOF: GitHub workflow logs
```

### State: Merged

```
WHO: Owner or Coordinator (merge authority)
AUTHORITY: Only after Claude approval
ACTION: Squashed merge to main
TRIGGER: Post-merge CI runs
RECORD: Main branch commit, CI run #NNN
PROOF: git log, GitHub Actions
```

### State: Deployed

```
WHO: Owner or Coordinator (deployment authority)
AUTHORITY: After post-merge CI passes
PROCESS: Staging test → Owner approval → Production deploy
RECORD: Deployment timestamp, commit hash, environment
PROOF: Deployment ticket, commit tag
```

### State: Closed

```
WHO: Coordinator
AUTHORITY: When task complete and live
ACTION: Issue closed, delivery report written
RECORD: DELIVERY-TEMPLATE.md entry
PROOF: Delivery report + evidence links
```

---

## 6. Emergency Authority

### 6.1 Production Down Scenario

```
Scenario: API repeatedly 500-erroring, customers impacted

Trigger: "PRODUCTION_DOWN" declaration
Authority: Owner only (unilateral)
Process:
  1. Owner: "EMERGENCY: Rolling back commit abc123"
  2. GPT: Hotfix written in 30 minutes
  3. Claude: Fast-track review (30 min)
  4. Owner: Approve hotfix
  5. Deploy to production
  6. Monitor recovery (30 min)

PROOF: GitHub issue + commit + deployment log
```

### 6.2 Security Breach Scenario

```
Scenario: API key exposed in Git history

Authority: Owner + Claude (immediate action)
Process:
  1. Claude detects: "SECURITY BREACH: API key in log"
  2. Owner: Invalidates key immediately
  3. GPT: Creates HOTFIX branch
  4. Commit: Remove exposure from history
  5. Force-push (only time allowed) + immediate deploy
  6. Notification: Customers + monitoring
  7. Post-mortem: 24 hours

PROOF: Security incident report
```

---

## 7. Responsibility and Accountability

### 7.1 Who Is Responsible

| Output | Owner | GPT | Claude |
|---|---|---|---|
| **Code quality** | ✓ Final | ✓ Primary | ✓ Verify |
| **Security** | ✓ Final | ~ (no hardcoding) | ✓ Verify |
| **Performance** | ✓ Final | ~ (follows patterns) | ✓ Verify |
| **Costs** | ✓ Final | ~ (estimates) | ✓ Flag overages |
| **Uptime** | ✓ Final | ✗ | ✗ |
| **Data safety** | ✓ Final | ~ (tests) | ✓ Verify |
| **Compliance** | ✓ Final | ~ (follows rules) | ✓ Verify |

### 7.2 Failure Scenarios

#### Scenario: GPT writes insecure code

```
Event: SQL injection vulnerability found in production
Fault Tree:
  1. GPT wrote vulnerable code ← GPT responsible
  2. Claude didn't catch it ← Claude responsible
  3. Tests didn't cover it ← GPT responsible
  4. Owner deployed anyway ← Owner responsible

Consequence:
  - Security patch PR (URGENT)
  - Post-mortem issue
  - Review process improved (D13 updated?)
  - All three parties sign off on prevention
```

#### Scenario: Claude rejects good code

```
Event: PR rejected for 2 weeks, deadline missed
Fault Tree:
  1. Is Claude's concern valid? → Yes → Keep requirement
  2. Is Claude's concern valid? → No → Move forward
  3. Timeline pressure real? → Yes → Emergency process
  
Consequence:
  - If Claude wrong: Update process (D15 clarification)
  - If Claude right but slow: Update SLA (D01)
```

#### Scenario: Owner deploys unreviewed code

```
Event: Owner force-merges unreviewed PR to production
Violation: Bypassed Claude review (D01 violation)
Consequence:
  - Immediate roll-back (if safe)
  - Post-mortem mandatory
  - Policy reinforced: No bypassing Claude review
  - Consider if Owner needs support (understaffed? time pressure?)
```

---

## 8. Audit and Compliance

### 8.1 Every Task MUST Have

```json
{
  "task_id": "MOUSE-NNN",
  "authority": {
    "created_by": "owner",
    "created_at": "2026-09-28T10:00Z",
    
    "executor": "gpt",
    "execution_started": "2026-09-28T10:30Z",
    
    "reviewer": "claude",
    "review_completed": "2026-09-28T14:00Z",
    "review_decision": "approved",
    
    "merger": "owner",
    "merged_at": "2026-09-28T15:00Z",
    
    "deployer": "owner",
    "deployed_at": "2026-09-28T16:00Z",
    "deployed_to": "production"
  },
  "evidence": {
    "issue": "https://github.com/.../issues/123",
    "pr": "https://github.com/.../pull/42",
    "ci_run": "https://github.com/.../actions/runs/...",
    "commit": "abc123def...",
    "deployment": "prod-v1.2.0"
  }
}
```

### 8.2 Audit Queries

```bash
# Who deployed what?
$ SELECT * FROM tasks WHERE deployed_by = 'owner'

# Any unreviewed merges?
$ SELECT * FROM tasks WHERE merged = true AND reviewed = false

# How many times did Claude reject?
$ SELECT COUNT(*) FROM pr_reviews 
  WHERE state = 'changes_requested'

# Average review time?
$ SELECT AVG(review_time) FROM pr_reviews
```

---

## 9. Escalation Authority

### 9.1 Decision Tree

```
Decision needed
  ↓
Can GPT decide alone? No → Go to next
Can Claude decide alone? No → Go to next
Can Coordinator decide? No → Go to next
Escalate to Owner
  ↓
Owner decides (final)
```

### 9.2 Examples

```
Q: Should we use Inngest or Temporal?
A: Architecture decision → Owner decides (after RFC)

Q: Does this code have a bug?
A: Technical question → Claude decides (after review)

Q: Can we delay this task?
A: Timeline decision → Owner decides

Q: Is this test scenario important?
A: Test quality → Claude decides (feedback to GPT)
```

---

## 10. Authority Revocation

### 10.1 When Authority Delegated Can Be Revoked

```
Scenario: GPT consistently ignores Claude feedback
Action: Owner revokes GPT's authority
Result: GPT cannot commit to main until retrained/reviewed
Recovery: Process/expectations clarified, authority restored

Scenario: Claude approves code with security bugs
Action: Owner reviews Claude's process
Result: Double-review required for sensitive areas
Recovery: Root cause addressed (training? overload?)
```

### 10.2 Re-authorization

```
After revocation:
1. Root cause identified
2. Corrective action taken
3. Trial period (5 tasks)
4. Owner re-authorizes
```

---

## 11. Knowledge and Training Authority

### 11.1 Who Trains Whom

| Area | Trainer | Trainee | Evidence |
|---|---|---|---|
| Code style | Claude (via PR comments) | GPT | PR review thread |
| Architecture | Owner (via RFC feedback) | GPT + Claude | RFC discussion |
| Security | Claude (via PR review) | GPT | Security comments |
| Operations | Owner (via runbooks) | All | Signed off runbook |
| Project vision | Owner | GPT + Claude | Roadmap doc |

### 11.2 Continuous Learning

- Claude reviews GPT's code and provides feedback (training effect)
- GPT sees what Claude rejects and adjusts
- Owner tracks patterns and adjusts authority boundaries
- Quarterly review: Are roles still working?

---

## 12. Related Documents

- [D01 - Final Constitution](./D01-final-constitution.md)
- [D14 - AI Tool Role Matrix](./D14-ai-tool-role-matrix.md)
- [D15 - GPT-Claude Separation](./D15-gpt-claude-separation.md)
- [D12 - Task Registry](./D12-task-registry.md)
- [D13 - Change Control](./D13-change-control.md)

---

**Effective Date**: 2026-09-28  
**Owner**: Project Coordinator  
**Last Reviewed**: 2026-09-28  

This law binds all contributors and is foundational to MauseAI's operational model.
