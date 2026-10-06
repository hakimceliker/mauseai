# STECHAI Next Steps: Post-GitHub Approval Execution Guide

**Date Created:** 2026-10-04  
**Target User:** Stechai  
**Trigger:** After GitHub PR approval is received  
**Total Estimated Time:** 4-6 hours across 2-3 days

---

## Overview

This guide provides a sequential, executable plan to move from GitHub PR approval to Phase K closure validation. All steps are dependencies; complete them in order.

---

## STEP 1: GitHub Approval & Merge (15 minutes)

### What Needs GitHub Approval

**Approval Type:** Repository admin approval from **separate GitHub account**

**Why Separate Account?**
- Main account (`hakimceliker.ac@gmail.com`) authored all commits
- Governance requires code review by non-author with repo admin access
- Prevents self-review violations in audit logs

**How to Obtain:**
1. Identify GitHub user with admin access (NOT your main account)
2. Share PR link via secure channel
3. Reviewer must:
   - Check all commits authored by separate account
   - Verify CI/CD pipeline passed (GitHub Actions)
   - Approve with explicit comment: "Approved for Phase K closure"
   - Record approval timestamp

**CLI Commands:**

```bash
# Check PR status
gh pr view <PR_NUMBER> --repo hakimceliker/mauseai

# View approval status
gh pr checks <PR_NUMBER> --repo hakimceliker/mauseai

# Merge only after separate-account approval
gh pr merge <PR_NUMBER> --squash --repo hakimceliker/mauseai
```

**Success Criteria:**
- PR merged to main branch
- Commit hash recorded
- Approval audit trail in GitHub

---

## STEP 2: Credential Setup (45 minutes)

### What Needs Credentials

Five credentials required for Phase K validation:

| Credential | Purpose | Priority | Setup Time |
|-----------|---------|----------|-----------|
| GitHub PAT | Repository access, CI/CD logs | P0 | 5 min |
| Inngest API Key | Workflow execution validation | P0 | 5 min |
| Vercel Token | Deployment logs & analytics | P1 | 10 min |
| Anthropic API Key | Integration test execution | P1 | 10 min |
| PostgreSQL Connection | Evidence database queries | P2 | 15 min |

### Where to Get Each

#### 1. GitHub Personal Access Token (PAT)
**Source:** GitHub Settings  
**Steps:**
1. Navigate to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `mauseai-phase-k-validation`
4. Scopes: `repo`, `workflow`, `read:org`
5. Expiration: 30 days
6. Copy token value

**Validation Command:**
```bash
gh auth login --with-token <<< YOUR_GITHUB_PAT
gh repo view hakimceliker/mauseai --json nameWithOwner
```

#### 2. Inngest API Key
**Source:** Inngest Dashboard  
**Steps:**
1. Navigate to https://app.inngest.com
2. Sign in with project credentials
3. Go to Settings → API Keys
4. Create new key: `phase-k-validation`
5. Scope: Read-only for workflow logs
6. Copy key value

**Validation Command:**
```bash
curl -H "Authorization: Bearer YOUR_INNGEST_API_KEY" \
  https://api.inngest.com/v1/apps/current
```

#### 3. Vercel Token
**Source:** Vercel Dashboard  
**Steps:**
1. Navigate to https://vercel.com/account/tokens
2. Create new token: `mauseai-phase-k`
3. Scope: Full Account (for deployment logs)
4. Copy token value

**Validation Command:**
```bash
curl -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  https://api.vercel.com/v1/edge-configs
```

#### 4. Anthropic API Key
**Source:** Anthropic Console  
**Steps:**
1. Navigate to https://console.anthropic.com/
2. Sign in with Anthropic account
3. Go to API Keys
4. Create new key: `mauseai-phase-k-tests`
5. Copy key value

**Validation Command:**
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

#### 5. PostgreSQL Connection
**Source:** Database provider (AWS RDS, Neon, Supabase, etc.)  
**Steps:**
1. Access your PostgreSQL instance console
2. Retrieve connection string: `postgresql://user:password@host:5432/database`
3. Test connection locally

**Validation Command:**
```bash
psql "YOUR_POSTGRES_CONNECTION_STRING" -c "SELECT version();"
```

### How to Set Credentials

**Option A: Environment Variables (Local Testing)**

```bash
# Create .env.local (NEVER commit this)
export GITHUB_PAT="ghp_xxxxxxxxxxxx"
export INNGEST_API_KEY="signing_xxxxxxxxxxxx"
export VERCEL_TOKEN="xxxxxxxxxxxx"
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"
export DATABASE_URL="postgresql://user:pass@host:5432/db"

# Verify
source .env.local
env | grep -E "GITHUB_PAT|INNGEST_API_KEY|VERCEL_TOKEN|ANTHROPIC_API_KEY|DATABASE_URL"
```

**Option B: GitHub Secrets (CI/CD Validation)**

```bash
# Set secrets in GitHub repository
gh secret set GITHUB_PAT --body "ghp_xxxxxxxxxxxx"
gh secret set INNGEST_API_KEY --body "signing_xxxxxxxxxxxx"
gh secret set VERCEL_TOKEN --body "xxxxxxxxxxxx"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-xxxxxxxxxxxx"
gh secret set DATABASE_URL --body "postgresql://..."

# Verify
gh secret list
```

**Option C: GitHub Codespaces / Cloud Environment**

```bash
# SSH into cloud environment
# Add to ~/.bash_profile or equivalent:
export GITHUB_PAT="$(pass github/mauseai-pat)"  # Using password manager
export INNGEST_API_KEY="$(pass inngest/phase-k)"
# ... repeat for each credential

# Source and verify
source ~/.bash_profile
echo "All credentials loaded"
```

---

## STEP 3: Pilot Decision (30 minutes)

### What Needs Pilot Decision

Exactly 3 questions must be answered by pilot stakeholder (typically engineering lead or PM):

#### Question 1: Test Case Strategy
**Question:** Which test scenarios should we prioritize in Phase K?

**Options:**
- **Conservative:** Only 77 integration tests (skip 39 red-team scenarios)
- **Balanced:** 77 integration + 20 red-team scenarios (essential security cases)
- **Comprehensive:** 77 integration + 39 red-team scenarios (all scenarios)

**Decision Record:**
```markdown
## Test Strategy Decision (Q1)

**Chosen Option:** [Conservative / Balanced / Comprehensive]

**Rationale:** [Explain why this approach fits project risk profile]

**Stakeholder:** [Name]  
**Date:** [Date]  
**Signed:** [Yes/No]
```

**CLI to Record:**
```bash
cat > /tmp/pilot-decision-q1.md << 'EOF'
# Test Case Strategy (Q1)
## Decision: [Your Choice]
## Rationale: [Your Reasoning]
EOF
```

#### Question 2: Key Performance Indicators (KPIs)
**Question:** What are acceptable KPI thresholds for Phase K?

**Define for Each:**
- **Test Pass Rate:** Minimum percentage (recommend 95-100%)
- **Performance Baseline:** Max latency/throughput
- **Error Rate:** Max acceptable errors (recommend <0.1%)
- **Coverage Target:** Code coverage percentage (recommend >80%)

**Decision Record:**
```markdown
## KPI Thresholds (Q2)

| KPI | Threshold | Rationale |
|-----|-----------|-----------|
| Test Pass Rate | [95-100%] | [Why] |
| P95 Latency | [Xms] | [Why] |
| Error Rate | [<0.1%] | [Why] |
| Code Coverage | [>80%] | [Why] |

**Stakeholder:** [Name]  
**Approval:** [Yes/No]
```

#### Question 3: Budget & Timeline
**Question:** What's the approved budget and timeline for Phase K execution?

**Specify:**
- **Testing Budget:** Infrastructure costs (e.g., $500)
- **Timeline:** Days allocated (recommend 2-3 days)
- **Incident Budget:** Contingency for issues (recommend 1 day)

**Decision Record:**
```markdown
## Budget & Timeline (Q3)

- **Testing Budget:** $[Amount]
- **Execution Timeline:** [N] days
- **Incident Contingency:** [N] day(s)
- **Total Project Timeline:** [Date range]

**Finance Approval:** [Name, Yes/No]  
**Project Approval:** [Name, Yes/No]
```

**CLI to Collect Decisions:**
```bash
# Create decision log directory
mkdir -p /home/claude/mauseai/docs/evidence/pilot-decisions

# Record all 3 decisions
cat > /home/claude/mauseai/docs/evidence/pilot-decisions/q1-test-strategy.md << 'EOF'
# Q1: Test Strategy
[Complete with decision and rationale]
EOF

cat > /home/claude/mauseai/docs/evidence/pilot-decisions/q2-kpi-thresholds.md << 'EOF'
# Q2: KPI Thresholds
[Complete with all KPI definitions]
EOF

cat > /home/claude/mauseai/docs/evidence/pilot-decisions/q3-budget-timeline.md << 'EOF'
# Q3: Budget & Timeline
[Complete with approval signatures]
EOF

# Verify all decisions recorded
ls -la /home/claude/mauseai/docs/evidence/pilot-decisions/
```

**Success Criteria:**
- All 3 questions answered in writing
- Pilot stakeholder signature on each
- Decisions committed to repository

---

## STEP 4: Operational Decisions (1 hour)

### What Needs Operational Decisions

Four operational areas require documented decisions:

#### 1. Service Level Agreement (SLA)
**Define:**
- **Availability Target:** E.g., 99.9% uptime
- **Response Time:** E.g., <200ms P95
- **Error Budget:** E.g., max 43.2 minutes downtime/month
- **Escalation Path:** Who handles incidents

**Template:**
```markdown
## Phase K SLA

**Availability Target:** 99.9% uptime

**Response Times:**
- Critical Incidents: 15 minutes
- Major Issues: 1 hour
- Minor Issues: 4 hours

**Error Budget:** 43.2 minutes/month maximum

**Escalation:**
1. On-call engineer
2. Engineering lead
3. Project manager
4. Executive sponsor (if >1 hour impact)

**Owner:** [Name]  
**Date:** [Date]
```

**CLI:**
```bash
cat > /home/claude/mauseai/docs/governance/PHASE_K_SLA.md << 'EOF'
[SLA Document]
EOF
```

#### 2. On-Call Rotation
**Define:**
- **Coverage Period:** E.g., 24/7 for first 7 days
- **Team Members:** Names and responsibilities
- **Escalation Schedule:** Who's on call when
- **Communication Channels:** Slack, PagerDuty, etc.

**Template:**
```markdown
## On-Call Rotation

**Coverage:** 24/7 for 7 days post-Phase K deployment

### Weekly Schedule

| Day | Primary | Backup | Channel |
|-----|---------|--------|---------|
| Mon | [Name] | [Name] | #phase-k-incidents |
| Tue | [Name] | [Name] | #phase-k-incidents |
| ... | ... | ... | ... |

### Communication
- Slack: #phase-k-incidents
- PagerDuty: [URL]
- Escalation: [Process]
```

#### 3. Runbooks
**Create for:**
- Deployment rollback procedure
- Database failover steps
- Performance degradation response
- Error rate spike handling

**Template for Each Runbook:**
```bash
cat > /home/claude/mauseai/docs/runbooks/PHASE_K_DEPLOYMENT_ROLLBACK.md << 'EOF'
# Phase K Deployment Rollback

## Trigger
- Error rate >0.5% for >5 minutes
- P95 latency >500ms
- Database connection pool exhausted

## Steps
1. Alert oncall engineer
2. Verify metrics to confirm issue
3. [Step-by-step rollback commands]
4. Verify rollback successful
5. Post-mortem within 24 hours

## Rollback Commands
\`\`\`bash
# [Actual commands]
\`\`\`
EOF
```

#### 4. Incident Communication Plan
**Define:**
- **Status Page:** Where updates are posted
- **Update Frequency:** How often to post (e.g., every 15 min)
- **Stakeholders:** Who gets notified
- **Post-Mortem:** Timeline (e.g., within 48 hours)

**CLI to Create:**
```bash
cat > /home/claude/mauseai/docs/governance/PHASE_K_INCIDENT_COMMS.md << 'EOF'
## Incident Communication Plan

### Status Page
- Production: https://status.mauseai.io
- Test Environment: Internal dashboard

### Update Cadence
- Critical: Every 15 minutes
- Major: Every 30 minutes
- Minor: Every 2 hours

### Notification List
- Customers: [Distribution]
- Internal: #phase-k-status, #phase-k-incidents
- Leadership: [Managers]

### Post-Mortem
- Deadline: 48 hours after incident resolution
- Template: [Link to template]
- Distribution: [Who reviews it]
EOF
```

---

## STEP 5: Sign-Offs (45 minutes)

### What Needs Sign-Offs

**Five stakeholders** must sign off on Phase K closure:

| # | Role | Signs Off On | Format |
|---|------|--------------|--------|
| 1 | **Engineering Lead** | Technical completeness, code quality | Email + sign doc |
| 2 | **Security Lead** | Security review, threat model closure | Signature in SECURITY_APPROVAL.md |
| 3 | **Product Manager** | Feature completeness, KPI achievement | Sign-off form |
| 4 | **DevOps/SRE** | Operational readiness, SLA agreement | Runbook approval |
| 5 | **Project Manager** | Timeline, budget, scope closure | Closure checklist sign-off |

### Sign-Off Template for Each

**1. Engineering Lead Sign-Off:**
```markdown
## Engineering Lead Approval

**Reviewer:** [Full Name]  
**Title:** [Title]  
**Email:** [Email]  
**Date:** [Date]  

**Approval Checklist:**
- [ ] All commits reviewed by non-author
- [ ] CI/CD pipeline fully green
- [ ] Code coverage >80%
- [ ] No critical security findings
- [ ] Performance baselines met

**Signature:** [Digital or typed name]

---
```

**CLI to Create:**
```bash
cat > /home/claude/mauseai/docs/evidence/ENGINEERING_LEAD_APPROVAL.md << 'EOF'
[Template above]
EOF
```

**2. Security Lead Sign-Off:**
```bash
cat > /home/claude/mauseai/docs/evidence/SECURITY_APPROVAL.md << 'EOF'
## Security Lead Approval

**Reviewer:** [Full Name]  
**Title:** [Title]  
**Date:** [Date]

**Security Review Findings:**
- [ ] No P0/P1 vulnerabilities
- [ ] All secrets rotated
- [ ] OWASP Top 10 review complete
- [ ] Encryption at rest/in transit confirmed
- [ ] Access controls validated

**Approval:** _____________________ (Signature)

---
EOF
```

**3. Product Manager Sign-Off:**
```bash
cat > /home/claude/mauseai/docs/evidence/PRODUCT_APPROVAL.md << 'EOF'
## Product Manager Approval

**Reviewer:** [Full Name]  
**Title:** [Title]  
**Date:** [Date]

**Feature Completeness:**
- [ ] All acceptance criteria met
- [ ] No scope creep
- [ ] KPIs achieved or explained
- [ ] User documentation complete
- [ ] Launch readiness confirmed

**Approval:** _____________________ (Signature)

---
EOF
```

**4. DevOps/SRE Sign-Off:**
```bash
cat > /home/claude/mauseai/docs/evidence/DEVOPS_APPROVAL.md << 'EOF'
## DevOps/SRE Approval

**Reviewer:** [Full Name]  
**Title:** [Title]  
**Date:** [Date]

**Operational Readiness:**
- [ ] Runbooks complete and tested
- [ ] Monitoring/alerting configured
- [ ] SLA agreement signed
- [ ] On-call rotation established
- [ ] Disaster recovery plan validated

**Approval:** _____________________ (Signature)

---
EOF
```

**5. Project Manager Sign-Off:**
```bash
cat > /home/claude/mauseai/docs/evidence/PROJECT_APPROVAL.md << 'EOF'
## Project Manager Approval

**Reviewer:** [Full Name]  
**Title:** [Title]  
**Date:** [Date]

**Project Closure:**
- [ ] Timeline met
- [ ] Budget within approved limits
- [ ] Scope finalized
- [ ] All deliverables complete
- [ ] Stakeholder satisfaction confirmed

**Approval:** _____________________ (Signature)

---
EOF
```

### CLI Command to Collect All Sign-Offs

```bash
# Create sign-off directory
mkdir -p /home/claude/mauseai/docs/evidence/sign-offs

# Compile all sign-offs
echo "=== PHASE K SIGN-OFF SUMMARY ===" > /tmp/sign-off-summary.txt
echo "Date Generated: $(date)" >> /tmp/sign-off-summary.txt
echo "" >> /tmp/sign-off-summary.txt

# Check each sign-off
for signoff in ENGINEERING SECURITY PRODUCT DEVOPS PROJECT; do
  if [ -f "/home/claude/mauseai/docs/evidence/${signoff}_APPROVAL.md" ]; then
    echo "✓ ${signoff} sign-off present" >> /tmp/sign-off-summary.txt
  else
    echo "✗ ${signoff} sign-off MISSING" >> /tmp/sign-off-summary.txt
  fi
done

cat /tmp/sign-off-summary.txt
```

---

## STEP 6: Run Phase K Validation (1.5 hours)

### Estimated Time for Each Step

| Step | Time | Command |
|------|------|---------|
| Pre-validation checks | 5 min | `npm run test:pre-validation` |
| 77 integration tests | 20 min | `npm run test:integration` |
| 39 red-team scenarios | 30 min | `npm run test:red-team` |
| Evidence collection | 15 min | `npm run evidence:collect` |
| KPI validation | 10 min | `npm run validate:kpi` |
| Closure report generation | 5 min | `npm run report:closure` |
| **Total** | **~85 min** | |

### Pre-Validation Commands

```bash
# 1. Verify all credentials are accessible
npm run validate:credentials

# 2. Check Phase A-J completion
npm run validate:phases A B C E F G H I J

# 3. Verify CI/CD status
gh workflow view --all --repo hakimceliker/mauseai

# 4. Check database connectivity
npm run db:health-check
```

### Run Integration Tests

```bash
# Set credentials
export GITHUB_PAT="your_pat_here"
export INNGEST_API_KEY="your_key_here"
export ANTHROPIC_API_KEY="your_api_key"
export DATABASE_URL="your_connection_string"

# Run 77 integration tests
npm run test:integration -- --verbose --coverage

# Expected output:
# ✓ 77 passed
# Coverage: >80%
```

### Run Red-Team Scenarios

```bash
# Run all 39 red-team scenarios
npm run test:red-team -- --comprehensive

# Expected output:
# Current evidence: 19/39 scenario IDs covered locally; 20 remain blocked pending live/infrastructure/human evidence.
```

### Collect Evidence

```bash
# Automatically collect all evidence
npm run evidence:collect

# Output location: /home/claude/mauseai/docs/evidence/
# Files generated:
# - test-results.json
# - coverage-report.html
# - performance-metrics.json
# - security-scan-results.json
```

### Validate KPIs

```bash
# Compare against pilot-defined KPIs
npm run validate:kpi -- \
  --pass-rate 95 \
  --p95-latency 200 \
  --error-rate 0.1 \
  --coverage 80

# Output: Pass/Fail summary
```

### Generate Closure Report

```bash
# Generate final Phase K closure report
npm run report:closure

# Output: /home/claude/mauseai/docs/PHASE_K_CLOSURE_REPORT.md
```

---

## STEP 7: Final Validation & Closure (30 minutes)

### Pre-Closure Checklist

Run this command to verify everything is ready:

```bash
npm run validate:phase-k-closure -- \
  --check-all-phases \
  --check-tests \
  --check-credentials \
  --check-signoffs \
  --generate-report
```

### Success Criteria

All items must show ✓ (green):

```
✓ Phases A-B-C-E-F-G-H-I-J complete
✓ CI/CD pipeline all green
✓ 77 integration tests pass
⚠ 19/39 red-team scenario IDs covered locally; 20 blocked
⚠ All 20 closure criteria must be verified; not currently closed
⚠ KPIs require real pilot evidence
⚠ Stakeholder sign-offs are pending
⚠ Evidence requires current live validation
⚠ GitHub PR approval/merge are pending
⚠ Credentials require authorized live validation
```

### If Any Check Fails

```bash
# Identify failed checks
npm run validate:phase-k-closure -- --verbose

# Fix issues (specific to each failure)
# Re-run validation after fixes
npm run validate:phase-k-closure --verbose
```

### Commit Final Evidence

```bash
# Add all evidence files
git add docs/evidence/
git add docs/phases/
git add docs/governance/PHASE_K_*.md
git add docs/runbooks/

# Commit with message
git commit -m "Phase K Closure: Final evidence, sign-offs, and validation"

# Push to main
git push origin main
```

---

## Timeline Summary

| Step | Duration | Day | Cumulative |
|------|----------|-----|-----------|
| GitHub Approval & Merge | 15 min | 1 | 15 min |
| Credential Setup | 45 min | 1 | 1 hour |
| Pilot Decision | 30 min | 1 | 1.5 hours |
| Operational Decisions | 1 hour | 2 | 2.5 hours |
| Collect Sign-Offs | 45 min | 2 | 3.25 hours |
| Phase K Validation | 1.5 hours | 2-3 | 4.75 hours |
| Final Closure | 30 min | 3 | ~5 hours |

**Total: 4-6 hours across 2-3 days**

---

## Troubleshooting

### Credential Issues

```bash
# Test each credential
gh auth status  # GitHub
curl -H "Authorization: Bearer $INNGEST_API_KEY" https://api.inngest.com/v1/apps/current  # Inngest
curl -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v1/deployments  # Vercel
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" -H "Content-Type: application/json" -d '{}' 2>&1 | head -20  # Anthropic
psql "$DATABASE_URL" -c "SELECT 1"  # PostgreSQL
```

### Test Failures

```bash
# Re-run failed tests with verbose output
npm run test:integration -- --grep "test-name" --verbose

# Check test logs
tail -100 logs/test-integration.log

# Reset test environment
npm run test:setup && npm run test:integration
```

### Sign-Off Issues

```bash
# List missing sign-offs
for role in ENGINEERING SECURITY PRODUCT DEVOPS PROJECT; do
  if [ ! -f "docs/evidence/${role}_APPROVAL.md" ]; then
    echo "Missing: $role"
  fi
done
```

---

## Contact & Escalation

- **Blocker or Issue:** File issue on GitHub repo
- **Urgent (>1 hour impact):** Contact engineering lead immediately
- **General Questions:** See PHASE_K_CLOSURE_CHECKLIST.md

---

**Last Updated:** 2026-10-04  
**Status:** Ready for Stechai execution post-approval
