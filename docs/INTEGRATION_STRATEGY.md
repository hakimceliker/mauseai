# MauseAI Master Integration Strategy

## Overview
This document outlines how to merge all 11 Phase B branches, run full integration tests, and proceed through Phases C-K.

## Phase A-B Integration (Merge Strategy)

### Current Branch Status
```
main (HEAD @ 04256ac - Phase A init)
  ├── claude/phase-b1-contracts (dc1b2ff) ✓ READY FOR MERGE
  ├── claude/phase-b2-orchestrator (e39911a) ✓ READY FOR MERGE
  ├── claude/phase-b3-planner (b39a0eb) ✓ READY FOR MERGE
  ├── claude/phase-b4-agent-registry (7ae3a82) ✓ READY FOR MERGE
  ├── claude/phase-b5-task-engine (9731194) ✓ READY FOR MERGE
  ├── claude/phase-b6-handoff (TBD) [in progress]
  ├── claude/phase-b7-router (86d5e70) ✓ READY FOR MERGE
  ├── claude/phase-b8-judge-gate (379bcb0) ✓ READY FOR MERGE
  ├── claude/phase-b9-permission (TBD) [in progress]
  ├── claude/phase-b10-recovery (TBD) [in progress]
  └── claude/phase-b11-memory (TBD) [in progress]
```

### Merge Order (Dependency-Safe)
1. **B1 Contracts** (dc1b2ff) - No dependencies
2. **B2 Orchestrator** (e39911a) - Depends on B1
3. **B3 Planner** (b39a0eb) - Depends on B1
4. **B4 Agent Registry** (7ae3a82) - Depends on B1
5. **B5 Task Engine** (9731194) - Depends on B1-B4
6. **B7 Router** (86d5e70) - Depends on B1, B4
7. **B8 Judge & Gate** (379bcb0) - Depends on B1, B5
8. **B6 Handoff** - Depends on B1-B5 (wait for completion)
9. **B9 Permission** - Depends on B1, B5, B7 (wait for completion)
10. **B10 Recovery** - Depends on B1-B5, B7 (wait for completion)
11. **B11 Memory** - Depends on all B1-B10 (wait for completion)

### Merge Commands (Post-Review)
```bash
# After independent review approval on each branch:

git checkout main
git pull origin main

# Merge B1 (no conflicts expected)
git merge --no-ff claude/phase-b1-contracts -m "Merge Phase B1: Contracts (dc1b2ff)"

# Merge B2 (depends on B1, now in main)
git merge --no-ff claude/phase-b2-orchestrator -m "Merge Phase B2: Orchestrator (e39911a)"

# ... continue in order ...

# Final result: main has all B1-B11 integrated
git push origin main
```

### Merge Conflict Resolution
Expected conflicts: Minimal (different directories per phase)
- `src/core/contracts/` → B1
- `src/core/orchestrator/` → B2
- `src/core/planner/` → B3
- `src/core/agents/` → B4
- `src/core/task-engine/` → B5
- `src/core/routing/` → B7
- `src/core/evidence/` → B8
- `src/core/permissions/` → B9
- `src/core/recovery/` → B10
- `src/core/memory/` → B11

**Action:** If conflicts occur:
1. Keep both versions (different modules)
2. Re-run full test suite post-merge
3. Update main branch tests index

### Post-Merge Verification
```bash
# Run all B1-B11 tests
npm run test:all-phases

# Verify CI passes
git log --oneline -20 # Should see all merges

# Create release notes
cat > RELEASE_NOTES.md << EOF
## Phase B Complete: Core Runtime & Advanced Runtime

### What's New
- B1-B11: Complete LETFON runtime framework
- 169+ tests passing (B1-B5)
- 117+ tests passing (B6-B11, pending B6 completion)
- Zero secrets in evidence
- Full judge independence enforced
- Local-first provider routing
- Production-grade task state machine

### Merges
$(git log --oneline main..HEAD | head -15)

### Next: Phase C-E (Credential-Gated Testing)
EOF
```

## Phase C-E: Credential Configuration Guide

### What Credentials Are Needed?

#### Phase C - Auth/Tenant/RLS Testing
Requires: **Auth Provider** (pick one)
- **Option 1: Auth0**
  - Create app at auth0.com
  - Get: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
  - Environment variable: `AUTH0_CONFIG='{"domain":"...","clientId":"...","clientSecret":"..."}'`

- **Option 2: Keycloak** (self-hosted)
  - Deploy Keycloak server
  - Get: `KEYCLOAK_URL`, `REALM`, `CLIENT_ID`, `CLIENT_SECRET`
  - Environment variable: `KEYCLOAK_CONFIG='{"url":"...","realm":"...","clientId":"...","clientSecret":"..."}'`

- **Option 3: Firebase**
  - Create Firebase project at firebase.google.com
  - Get: `FIREBASE_CONFIG` JSON (download from Firebase console)
  - Environment variable: `FIREBASE_CONFIG='{"apiKey":"...","projectId":"...",...}'`

#### Phase D - Inngest Testing
Requires: **Inngest Production Key**
- Sign up at inngest.com
- Get: `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY`
- Environment variable: `INNGEST_CONFIG='{"apiKey":"...","signingKey":"..."}'`

#### Phase E - Provider Testing
Requires: **API Keys for 4 Providers**

1. **OpenAI (GPT-4)**
   - Sign up at openai.com/api
   - Get: `OPENAI_API_KEY`
   - Environment variable: `OPENAI_API_KEY='sk-...'`

2. **Anthropic (Claude)**
   - Already using! Get from Anthropic console
   - Get: `ANTHROPIC_API_KEY`
   - Environment variable: `ANTHROPIC_API_KEY='sk-ant-...'`

3. **Ollama (Local)**
   - Download ollama.ai
   - Run: `ollama serve`
   - Get: `OLLAMA_URL='http://localhost:11434'`
   - No API key required

4. **Observability (Datadog, NewRelic, or Prometheus)**
   - **Option A: Datadog**
     - Get: `DATADOG_API_KEY`, `DATADOG_APP_KEY`
   - **Option B: NewRelic**
     - Get: `NEW_RELIC_LICENSE_KEY`
   - **Option C: Prometheus** (self-hosted)
     - Setup Prometheus server
     - Get: `PROMETHEUS_URL='http://localhost:9090'`

### Credential Injection Procedure

Once credentials are ready:

```bash
# 1. Set environment variables (secure method)
export AUTH0_CONFIG='{"domain":"...","clientId":"...","clientSecret":"..."}'
export INNGEST_CONFIG='{"apiKey":"...","signingKey":"..."}'
export OPENAI_API_KEY='sk-...'
export ANTHROPIC_API_KEY='sk-ant-...'
export OLLAMA_URL='http://localhost:11434'
export DATADOG_API_KEY='...'

# 2. Create .env.test file (NEVER COMMIT)
cat > .env.test << EOF
AUTH0_CONFIG='...'
INNGEST_CONFIG='...'
OPENAI_API_KEY='...'
ANTHROPIC_API_KEY='...'
OLLAMA_URL='...'
DATADOG_API_KEY='...'
EOF

# 3. Run credential-gated tests
npm run test:phase-c
npm run test:phase-d
npm run test:phase-e

# 4. Verify evidence is clean (no credentials leaked)
npm run test:evidence-redaction
```

## Phase C-E: Full Implementation (Ready to Execute)

Once credentials are available, execute in this order:

### Phase C: Auth/Tenant/RLS Testing
```bash
# 1. Replace test framework scaffolds with real tests
# 2. Run against real auth provider
npm run test:phase-c

# 3. Verify:
# - Single tenant auth works
# - Multi-tenant isolation enforced
# - RLS enforcement verified
# - Token rotation works
# - Cross-tenant access denied

# 4. Collect evidence (no secrets)
npm run test:phase-c -- --reporter=json > phase-c-evidence.json
```

### Phase D: Inngest Testing
```bash
# 1. Connect to Inngest production
# 2. Test workflow definitions
npm run test:phase-d

# 3. Verify:
# - Workflows trigger correctly
# - Concurrency limits enforced
# - Retry logic works
# - Error handling tested

# 4. Collect evidence
npm run test:phase-d -- --reporter=json > phase-d-evidence.json
```

### Phase E: Provider Testing
```bash
# 1. Test all 4 providers
npm run test:phase-e

# 2. Verify:
# - OpenAI GPT-4 routing works
# - Anthropic Claude routing works
# - Local Ollama fallback works
# - Provider health checks work
# - Cost calculation accurate
# - Latency thresholds respected

# 4. Collect evidence
npm run test:phase-e -- --reporter=json > phase-e-evidence.json
```

## Integration Test Execution (Phase I)

```bash
# Run all 38 integration scenarios
npm run test:phase-i

# Expected result: All 38 PASS
# If any FAIL: Debug, fix, re-run (iterate until 38/38 PASS)

# Collect evidence
npm run test:phase-i -- --reporter=json > phase-i-evidence.json
```

## Red-Team Testing (Phase J)

```bash
# Run all 39 red-team failure scenarios
npm run test:phase-j

# Expected result: All 39 PASS (system handles attacks correctly)
# If any FAIL: Investigate vulnerability, fix, re-run

# Security audit output
npm run test:phase-j -- --reporter=json > phase-j-evidence.json

# Flag any CRITICAL vulnerabilities for emergency review
grep -i 'CRITICAL' phase-j-evidence.json && echo "!!! CRITICAL VULN DETECTED - ESCALATE !!!"
```

## Full Integration Checklist (Pre-Phase F)

Before moving to Phase F Pilot, verify:
- [ ] All B1-B11 branches merged to main
- [ ] Phase A infrastructure complete (registries, branch map)
- [ ] Phase B1-B11 code + tests passing in CI
- [ ] Phase C-E test frameworks complete with real credentials
- [ ] Phase C-E tests PASS (auth, Inngest, providers)
- [ ] Phase I integration chain (38/38 PASS)
- [ ] Phase J red-team (39/39 PASS, no CRITICAL vulns)
- [ ] Evidence collected for all phases (zero secrets)
- [ ] Judge independence verified for all review/approval decisions
- [ ] Phase F pilot parameters defined (2 test cases, KPIs, budget)

Once all checked: **Proceed to Phase F Pilot Execution**

## Timeline Estimate

- **B6-B11 Completion:** 30-60 min (workers running in parallel)
- **B1-B11 Merge:** 10 min (no conflicts expected)
- **CI/Full Test Suite:** 10 min
- **Credential Setup:** 30-60 min (one-time, depends on provider signup speed)
- **Phase C-E Execution:** 20-30 min (once credentials ready)
- **Phase I-J Execution:** 30-45 min (integration + red-team)
- **Phase F Pilot:** 1-2 hours (real execution + data collection)
- **Phase G Release:** 30 min (checklist verification)
- **Phase H Operational:** 1-2 hours (drills + runbook validation)
- **Phase K Acceptance:** 15 min (final gate + sign-offs)

**Total: ~4-6 hours from now to full project acceptance**

## Risk Mitigation

- **Blocker:** Provider unavailable → Fallback to local Ollama
- **Blocker:** Credential leak → Evidence redaction enforced, rotation required
- **Blocker:** Test failure in C-E → Debug in staging, retry after fix
- **Blocker:** Phase F decision delayed → Continue with Phase I-J in parallel
- **Blocker:** Sign-off delayed → Continue with operational setup, resume at gate

## Next Phase

Once Phase B-K complete with all evidence collected:
→ **Phase L:** Production Deployment (separate LETFON instance)
