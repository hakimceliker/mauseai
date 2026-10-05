# Pre-Execution Checklist for Phase C-E

**Purpose:** Things to verify before running Phase C-E execution  
**Date:** 2026-10-05  
**Status:** Ready for deployment

---

## Pre-Flight Checks

### 1. Environment & Dependencies

- [ ] Node.js 18+ installed
  ```bash
  node --version  # Should output v18.x.x or higher
  ```

- [ ] npm dependencies installed
  ```bash
  npm list | head -20  # Verify packages are installed
  ```

- [ ] Git repository initialized
  ```bash
  git status  # Should show clean or tracked changes only
  ```

- [ ] Current branch is `main`
  ```bash
  git rev-parse --abbrev-ref HEAD  # Should output 'main'
  ```

- [ ] Working tree is clean
  ```bash
  git status --porcelain  # Should have no output or only untracked files
  ```

### 2. Credentials & Secrets

- [ ] `.env.local` file exists
  ```bash
  ls -la .env.local  # Should show file with appropriate permissions
  ```

- [ ] All 5 required credentials are set (validate with):
  ```bash
  npm run validate:credentials
  ```
  
  Required credentials:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `INNGEST_EVENT_KEY` - Inngest API key
  - `OPENAI_API_KEY` - OpenAI API key
  - `ANTHROPIC_API_KEY` - Anthropic API key (sk-ant-*)
  - `LOCAL_AI_BASE_URL` - Ollama local server URL (optional but recommended)

- [ ] No credentials are hardcoded in source files
  ```bash
  grep -r "sk-" src/ --include="*.ts" --include="*.tsx" | wc -l  # Should be 0
  ```

- [ ] `.env.local` is in `.gitignore`
  ```bash
  grep ".env.local" .gitignore  # Should show .env.local
  ```

### 3. External Services

- [ ] Supabase is accessible
  ```bash
  curl -s https://your-project.supabase.co/rest/v1/ -H "Authorization: Bearer YOUR_KEY" | head -5
  ```

- [ ] Inngest is accessible
  ```bash
  curl -s https://api.inngest.com/health
  ```

- [ ] OpenAI API is accessible
  ```bash
  curl -s -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models | head -5
  ```

- [ ] Anthropic API is accessible (key format validation)
  ```bash
  echo $ANTHROPIC_API_KEY | grep -q "^sk-ant-" && echo "Valid"
  ```

- [ ] Local Ollama server is running (if using local models)
  ```bash
  curl -s http://localhost:11434/api/tags | head -5
  ```

### 4. Project State

- [ ] Build succeeds
  ```bash
  npm run build
  ```

- [ ] No TypeScript errors
  ```bash
  npm run typecheck
  ```

- [ ] Tests pass (if available)
  ```bash
  npm run test -- --run  # Exit code 0
  ```

- [ ] No unresolved dependencies
  ```bash
  npm audit --production  # Should show "0 vulnerabilities"
  ```

- [ ] `reports/` directory exists or will be created
  ```bash
  mkdir -p reports
  ```

---

## Phase C-E Execution

### Start Execution

```bash
# Run Phase C-E executor
npx ts-node scripts/phase-c-e-executor.ts
```

### What to Expect

1. **Credential Validation** (30 seconds)
   - Validates all 5 required credentials
   - Checks connectivity to each provider
   - Displays status for each provider

2. **Test Execution** (5-15 minutes)
   - Runs 65 Phase C-E tests
   - Progress bar shows percentage complete
   - Tests for infrastructure, API, auth, monitoring, security, integrations

3. **Report Generation** (30 seconds)
   - Creates JSON report in `reports/phase-c-e-execution-{timestamp}.json`
   - Displays colored summary to console
   - Saves credentials status and test results

### Exit Codes

- `0` - All tests passed, credentials valid, ready to proceed
- `1` - Some tests failed or credentials missing, review report

---

## Interpreting Results

### Successful Run

```
✓ All required credentials configured
✓ Supabase: reachable (200)
✓ Inngest: reachable (200)
✓ OpenAI: reachable (200)
✓ Anthropic: reachable
✓ Ollama: reachable (200)

Phase C-E Execution Report
========================================================

Credentials Status:
  ✓ Supabase: Reachable
  ✓ Inngest: Reachable
  ✓ OpenAI: Reachable
  ✓ Anthropic: Reachable
  ✓ Ollama: Reachable

Test Results:
  Total: 65
  Passed: 65
  Failed: 0
  Skipped: 0
  Errors: 0

Summary: READY: All 65 tests passed
```

### Partial Success (Expected During Development)

```
Test Results:
  Total: 65
  Passed: 45
  Failed: 0
  Skipped: 20
  Errors: 0

Summary: Test frameworks may not be fully configured yet
```

### Failure Case

```
✗ Supabase: unreachable - Connection refused

ERROR: Phase C-E test execution failed
  - Missing credentials: Supabase
  - Failed tests: 15
  - Network errors: 3
```

---

## Common Issues & Solutions

### Issue: `.env.local` not found

**Solution:**
```bash
# Create .env.local with required credentials
cp .env.example .env.local
# Edit .env.local and add your API keys
nano .env.local
```

### Issue: "Cannot find module 'ts-node'"

**Solution:**
```bash
npm install -D ts-node typescript @types/node
```

### Issue: "ANTHROPIC_API_KEY invalid format"

**Solution:**
- Anthropic keys must start with `sk-ant-`
- Check for extra whitespace in .env.local
- Verify key is copied correctly from dashboard

### Issue: "Ollama unreachable"

**Solution:**
```bash
# Start Ollama if not running
ollama serve

# Or if using Docker
docker run -d -p 11434:11434 ollama/ollama

# Verify connectivity
curl http://localhost:11434/api/tags
```

### Issue: "Supabase connection refused"

**Solution:**
```bash
# Verify Supabase URL is correct format
# Should be: https://xxxxx.supabase.co

# Test with curl
curl -s https://your-project.supabase.co/rest/v1/ \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  | head -5
```

### Issue: "INNGEST_EVENT_KEY invalid"

**Solution:**
- Verify key is from Inngest dashboard (not webhook URL)
- Keys typically start with `evt_` or `signkey_`
- Check for extra characters or line breaks

### Issue: Build fails with "Module not found"

**Solution:**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Issue: "Permission denied" on executor script

**Solution:**
```bash
chmod +x scripts/phase-c-e-executor.ts
# Or run with ts-node
npx ts-node scripts/phase-c-e-executor.ts
```

---

## Rollback Procedures

### If Phase C-E Execution Fails

#### Rollback Level 1: Check Credentials

```bash
# Validate credentials without running tests
npm run validate:credentials

# If credentials are invalid, update .env.local and retry
nano .env.local
```

#### Rollback Level 2: Check Dependencies

```bash
# Verify all npm packages are installed
npm install

# Rebuild project
npm run build

# Run executor again
npx ts-node scripts/phase-c-e-executor.ts
```

#### Rollback Level 3: Clean Environment

```bash
# Remove generated artifacts
rm -rf .next dist build reports/phase-c-e-*

# Clean cache
npm cache clean --force

# Reinstall everything
rm -rf node_modules package-lock.json
npm install

# Verify build
npm run build

# Run executor again
npx ts-node scripts/phase-c-e-executor.ts
```

#### Rollback Level 4: Revert to Last Known Good State

```bash
# Check git status
git status

# If changes were made, stash or reset
git stash

# Verify you're on main branch
git checkout main

# Verify last known good commit
git log --oneline | head -5

# Retry execution
npx ts-node scripts/phase-c-e-executor.ts
```

---

## Success Validation Criteria

Phase C-E execution is considered successful when:

1. ✓ **Credentials Validation**
   - All 5 required credentials are configured
   - All credentials are reachable/valid

2. ✓ **Test Execution**
   - 65 total tests executed
   - Failed tests = 0
   - Errors = 0
   - At least 50 tests passed (or SKIP if test framework not configured)

3. ✓ **Report Generation**
   - JSON report created in `reports/`
   - Markdown summary available
   - Exit code = 0

4. ✓ **System State**
   - npm build succeeds
   - No unresolved dependencies
   - Git working tree clean

### Validation Command

```bash
# After Phase C-E completes, verify success:
if [ -f "reports/phase-c-e-execution-*.json" ]; then
  echo "✓ Phase C-E report generated"
  tail -20 reports/phase-c-e-execution-*.json
else
  echo "✗ Phase C-E report not found"
  exit 1
fi
```

---

## Next Steps After Phase C-E

Once Phase C-E execution succeeds:

1. **Run Phase I-J Executor** (Integration & Red-Team Tests)
   ```bash
   npx ts-node scripts/phase-i-j-executor.ts
   ```

2. **Run Phase K Closure** (Final Validation)
   ```bash
   npx ts-node scripts/phase-k-closure.ts
   ```

3. **Obtain Sign-Offs**
   - Technical Lead review
   - Project Manager approval
   - QA sign-off
   - Security review
   - Operations approval

4. **Create Project Archive**
   ```bash
   tar -czf mauseai-final-archive.tar.gz \
     --exclude=node_modules \
     --exclude=.next \
     --exclude=.git \
     .
   ```

---

## Support & Debugging

### Enable Debug Logging

```bash
DEBUG=* npx ts-node scripts/phase-c-e-executor.ts
```

### Review Detailed Report

```bash
# View latest execution report
cat reports/phase-c-e-execution-*.json | jq '.'

# View specific test results
cat reports/phase-c-e-execution-*.json | jq '.tests[] | select(.status=="FAIL")'
```

### Check Service Health

```bash
# Verify all external services
npm run validate:credentials

# Check individual services
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
curl https://api.inngest.com/health
curl $NEXT_PUBLIC_SUPABASE_URL
```

### Contact & Documentation

- **Phase C-E Executor:** `scripts/phase-c-e-executor.ts`
- **Credential Validation:** `scripts/validate-credentials.ts`
- **Phase System Flow:** `docs/mouseai-system-flow.html`
- **Architecture Docs:** `docs/`

---

**Last Updated:** 2026-10-05  
**Version:** 1.0  
**Author:** Claude Code  
