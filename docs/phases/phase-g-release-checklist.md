# Phase G - Release Checklist

## Code & Quality Readiness
- [ ] All phases A-F complete and CLOSED
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review: All PRs approved by independent reviewer
- [ ] Security: SAST scan complete, no HIGH/CRITICAL vulns
- [ ] Performance: Load tested, latency <5s p95
- [ ] Documentation: README, API docs, runbooks complete
- [ ] TypeScript strict mode: All files pass without errors
- [ ] Linting: ESLint passes across codebase

## Version & Release
- [ ] Semantic versioning: v0.1.0 (adjust based on scope)
- [ ] CHANGELOG.md updated with all features, fixes, security patches
- [ ] Git tag created: `git tag -a v0.1.0 -m "Release v0.1.0"`
- [ ] Release notes drafted (what's new, migration guide, known issues)
- [ ] Version bumped in package.json, environment configs

## Legal & Compliance
- [ ] LICENSE file present (MIT/Apache/Custom?)
- [ ] NOTICE file for dependencies
- [ ] Terms of Service reviewed by legal
- [ ] Privacy policy reviewed by legal (if user data)
- [ ] Compliance check: GDPR/SOC2/etc requirements
- [ ] Data retention policy documented
- [ ] Third-party licenses validated (no GPL conflicts)

## Infrastructure & Deployment Readiness
- [ ] Staging environment validated
- [ ] Production infrastructure ready
- [ ] Database migrations tested (if any)
- [ ] Secrets rotated, no stale API keys
- [ ] Backup/restore tested
- [ ] Disaster recovery plan documented
- [ ] DNS/CDN configuration ready
- [ ] Load balancer health checks configured

## Monitoring & Alerting
- [ ] Logging configured (all critical paths)
- [ ] Metrics dashboard setup
- [ ] Alerts configured for SLA breaches
- [ ] On-call escalation procedures
- [ ] Incident response playbook tested
- [ ] Centralized error tracking (Sentry/similar)
- [ ] APM instrumentation complete

## Go/No-Go Decision
- [ ] Product team: GO
- [ ] Engineering team: GO
- [ ] Ops team: GO
- [ ] Legal/Compliance: GO
- [ ] Finance/Budget owner: GO
- [ ] Security team: GO

**Go/No-Go date:** [YYYY-MM-DD]
**Release date:** [YYYY-MM-DD]
**Release manager:** [Name]
**Release window:** [Time and duration, e.g., 2PM-4PM PST Tuesday]

## Rollback Plan
If issues detected post-release:
1. Identify issue and assess severity
2. If CRITICAL: Execute rollback to previous version (see runbook)
3. Notify stakeholders immediately
4. Begin root cause analysis
5. Deploy fix to staging for validation
6. Re-release after validation

**Rollback procedure:** [Link to runbook]
**Estimated rollback time:** [X minutes]
**Communication channels:** [Slack, email, status page]

## Pre-Release Validation
- [ ] Smoke tests passed in production-like environment
- [ ] Database integrity verified
- [ ] API endpoints responding correctly
- [ ] Authentication/authorization working
- [ ] External service integrations verified
- [ ] Performance metrics baseline established

## Post-Release Monitoring (First 24 Hours)
- [ ] Error rates within expected range
- [ ] Latency within SLO
- [ ] No unexpected resource spikes
- [ ] User reports monitored
- [ ] Escalation team on heightened alert
