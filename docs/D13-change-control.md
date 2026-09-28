# D13 — Change Control and RFC Process

**Effective Date**: 2026-09-28  
**Owner**: Project Coordinator & Claude  
**Authority**: D01 - Final Constitution  

---

## 1. What Requires Change Control

### 1.1 Architecture Changes

Any change that affects system design:
- New major dependency (framework, database, service)
- Removal of component
- API contract change (breaking)
- Database schema migration
- Deployment topology change
- Protocol/encoding change
- Third-party integration (Stripe, Inngest, etc.)

**Process**: RFC (Request for Comment) + TASK-NNN

### 1.2 Policy Changes

Any update to governance:
- Constitution (D01)
- Standards (D12-D20)
- Runbooks or procedures
- Security policies

**Process**: Policy PR + Owner + Claude approval

### 1.3 Performance Changes

Any change impacting SLAs:
- Database index change
- Caching strategy
- API response time optimization
- Memory/CPU allocation

**Process**: Benchmark + RFC + TASK-NNN

### 1.4 Security Changes

Any change affecting security posture:
- RLS policy change
- Key rotation schedule
- Secret storage method
- Authentication mechanism

**Process**: Security review + RFC + TASK-NNN

### 1.5 Cost Changes

Any change affecting budget:
- New external service
- Increased pricing tier
- Volume commitments
- Licensing changes

**Process**: Cost analysis + RFC + Owner approval

---

## 2. RFC (Request for Comment) Process

### 2.1 Who Initiates

- GPT: Technical proposals
- Claude: Architecture/security concerns
- Owner: Strategic/budget decisions

### 2.2 RFC Template

**File**: `docs/rfc/RFC-NNN-title.md`

```markdown
# RFC-NNN: [Title]

## Summary
[1-2 sentence executive summary]

## Problem Statement
[Why change is needed?]

## Proposed Solution
[Detailed description of change]

## Alternatives Considered
[Other options and why rejected]

## Implementation Plan
[How it will be implemented]

## Costs
- Monetary cost: $X
- Time cost: Y hours
- Performance impact: [±]%

## Risks
- [Risk 1]: Mitigation
- [Risk 2]: Mitigation

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Timeline
- Discussion period: 3 days
- Decision: Day 4
- Implementation: Start after approval

## Related Documents
- [Link to related docs]

---
Author: [GPT|Claude|Owner]
Status: [Draft|Review|Approved|Implemented]
```

### 2.3 Review Window

1. **Draft** (Author only)
   - Internal review, refinement
   - Duration: 1 day

2. **Review** (Circulate)
   - Shared with Claude + Owner
   - Review period: **3 days**
   - Comments on GitHub issue

3. **Decision** (Day 4)
   - Owner decides: Approve / Reject / Revise
   - If Rejected: Document reason, close RFC
   - If Approved: Assign TASK-NNN

4. **Implementation**
   - Convert to TASK-NNN
   - Follow normal task workflow
   - Reference RFC in PR

### 2.4 Example RFC

**RFC-001: Temporal to Inngest Migration**

```
RFC opened: 2026-09-01
Review period: 2026-09-01 to 2026-09-04
Decision: 2026-09-04 (Approved)
TASK-050 created
Implementation: 2026-09-05 to 2026-09-30
```

---

## 3. Policy PR Process

### 3.1 Scope

Changes to:
- Constitution (D01)
- Task Registry (D12)
- Change Control (D13)
- AI Tool Matrix (D14)
- GPT-Claude Separation (D15)
- Task Authority Law (D20)
- Standards (TASK-ID, PHASE-NAMING, FILE-OWNERSHIP, PR-CI-RULES, SECRET-LAW)

### 3.2 Policy PR Workflow

```
Branch: docs/MOUSE-NNN-policy-update
PR Title: POLICY: [Change summary]
Approval: Owner ✓ + Claude ✓ (both must approve)
Merge: Squashed
Tag: v[X.Y.Z]
Changelog: Entry added
```

### 3.3 Policy Change Record

Every policy change logged:

```json
{
  "policy_id": "D01-v1.0 → D01-v1.1",
  "change": "Added risk level L3 for deploy approvals",
  "pr_number": 42,
  "approved_by": ["owner", "claude"],
  "effective_date": "2026-10-01",
  "changelog_link": "CHANGELOG.md#v1-1"
}
```

### 3.4 Backwards Compatibility

If policy change breaks existing tasks:

```
Old Policy (deprecated as of YYYY-MM-DD):
  [Old rule]

New Policy (effective as of YYYY-MM-DD):
  [New rule]

Migration Path:
  [How existing tasks transition]

Deadline:
  All tasks must comply by YYYY-MM-DD
```

---

## 4. Emergency Changes

### 4.1 When to Use Emergency Process

Production is down and cannot wait for normal approval cycle:

```
Condition: PRODUCTION_DOWN + Unrecoverable + Cannot wait
Decision: Owner declares emergency
Window: 2 hours max for decision
Approval: Owner only (Claude review optional)
```

### 4.2 Emergency Change Procedure

```
1. Owner declares: "EMERGENCY: [Reason]"
   - GitHub issue tag: "emergency"
   - Slack alert to team

2. GPT writes hotfix: hotfix/MOUSE-NNN-emergency
   - Minimal scope
   - Clear commit message
   - Local tests only (may skip some CI if critical)

3. Claude fast-track review (30 min)
   - Risk assessment
   - Security implications
   - Approval/rejection

4. Owner approves

5. Deploy to production

6. Post-mortem within 24 hours
   - What went wrong
   - Why emergency needed
   - Prevention measures
   - Process improvements
```

### 4.3 Post-Emergency

After every emergency change:

```
1. Issue: "POST-MORTEM: [Incident]"
2. Timeline: What, when, impact
3. Root cause: Why did it happen?
4. Remediation: What was the hotfix?
5. Prevention: What process change?
6. Owner signs off on prevention plan
7. If process failure: Update D01, D13
8. Archive: docs/incidents/YYYY-MM-DD-incident.md
```

---

## 5. Rollback Procedures

### 5.1 When to Rollback

Deployed change causes:
- ✗ Data loss or corruption
- ✗ Service downtime (>5 min)
- ✗ Security breach
- ✗ Critical feature broken
- ✗ SLA violation

### 5.2 Rollback Steps

```
1. Owner declares: "ROLLBACK: [Commit hash]"
   - GitHub issue: "Regression"
   - Slack alert

2. Git operations:
   $ git revert [merge commit]
   OR
   $ git reset --hard [previous commit] (nuclear option)

3. Deploy to production immediately

4. Post-mortem (same as emergency)
```

### 5.3 Rollback Prevention

Before every deploy, have:
- ✓ Rollback plan documented
- ✓ Previous version tested and ready
- ✓ Database migration reversible
- ✓ Monitoring alerts configured

---

## 6. Feature Flags (Dark Launches)

### 6.1 Usage

For risky changes, use feature flags instead of rollback:

```
// src/features/gpt-claude-router.ts

export const isAIRouterEnabled = () => {
  return process.env.FEATURE_AI_ROUTER === 'true';
};

// Usage
if (isAIRouterEnabled()) {
  // New code path
  result = new AIRouter().select(task);
} else {
  // Old code path
  result = gpt.process(task);
}
```

### 6.2 Flag Lifecycle

```
1. Development: Feature behind flag, merged to main
2. Staging: Enabled in staging, tested
3. Production Gradual Rollout:
   - 10% users → Monitor metrics
   - 25% users → OK? Continue
   - 50% users → OK? Continue
   - 100% users → Full rollout
4. Cleanup: Remove flag after 1 month

Configuration:
├─ Dev: FEATURE_X=true (100%)
├─ Staging: FEATURE_X=true (100%)
└─ Prod: FEATURE_X=true (10%→100%)
```

---

## 7. Version Bumping

### 7.1 Semantic Versioning

```
MAJOR.MINOR.PATCH

v0.1.0 → v0.2.0 → v1.0.0 → v1.1.0 → v2.0.0
```

### 7.2 Bump Rules

| Change | Increment | Example |
|---|---|---|
| Breaking change (DB migration, API break) | MAJOR | v1.0.0 → v2.0.0 |
| New feature (backward compatible) | MINOR | v1.0.0 → v1.1.0 |
| Bug fix, security patch | PATCH | v1.0.0 → v1.0.1 |

### 7.3 Release Workflow

```
1. Merge all PRs for release to main
2. Create release branch: release/v1.2.0
3. Update CHANGELOG.md
4. Bump version in package.json
5. Tag: git tag v1.2.0
6. Create GitHub Release with notes
7. Deploy to production
8. Monitor metrics
```

---

## 8. Monitoring Changes

### 8.1 Before Deployment

Set up monitoring for new features:

```
Metrics to track:
- Request latency (p50, p95, p99)
- Error rate
- Database query time
- Memory usage
- Cost per request
- User satisfaction (if applicable)
```

### 8.2 After Deployment

Monitor for regression:

```
Automated Alerts:
- Latency +10% → Alert
- Error rate >0.5% → Alert
- Cost >$10/day → Alert
- Memory spike >500MB → Alert

Manual Review:
- User feedback (1st week)
- Performance trends (1st month)
- Cost tracking (ongoing)
```

---

## 9. Documentation Requirements

### 9.1 During Change

Document as you go:
- RFC (if applicable)
- TASK-NNN PR description
- Code comments (why, not what)
- Test scenarios

### 9.2 After Merge

Update:
- CHANGELOG.md
- API docs (if applicable)
- Runbooks (if operational impact)
- README.md (if visible to users)

### 9.3 CHANGELOG Format

```markdown
## [Unreleased]

### Added
- New AI Router feature (MOUSE-080)
- Cost tracking telemetry (MOUSE-090)

### Changed
- Database schema v3 (MOUSE-050)
  ⚠️ **Breaking**: Requires migration

### Fixed
- Circuit breaker timeout bug (MOUSE-072)

### Deprecated
- Old GPT-only path (deprecated in v1.2, removed in v2.0)

### Removed
- Legacy Temporal adapter

### Security
- Updated dependencies for CVE-2026-XXXXX

### Performance
- Reduced query latency by 30% (MOUSE-095)

---

## [v1.2.0] - 2026-10-15
...
```

---

## 10. Related Documents

- [D01 - Final Constitution](./D01-final-constitution.md)
- [D12 - Task Registry](./D12-task-registry.md)
- [PR-CI-RULES](./standards/PR-CI-RULES.md)
- [DELIVERY-TEMPLATE](./DELIVERY-TEMPLATE.md)
- [CHANGELOG.md](../CHANGELOG.md) (in repo root)

---

**Owner**: Project Coordinator  
**Last Updated**: 2026-09-28  
**Effective From**: 2026-09-28  
