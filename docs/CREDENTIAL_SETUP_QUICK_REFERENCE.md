# Credential Setup Quick Reference

**Purpose:** 30-second setup guide for Phase K validation  
**Target Time:** <5 minutes per credential × 5 = <25 minutes total  
**Status:** Ready to execute  

---

## Quick Start

If you already have all credentials: Jump to [Validation Commands](#validation-commands-test-each-credential)  
If you need new credentials: Follow each section in order

---

## The 5 Credentials You Need

| # | Credential | Type | Urgency | Format |
|---|-----------|------|---------|--------|
| 1 | GitHub Personal Access Token (PAT) | API Token | P0 | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| 2 | Inngest API Key | API Key | P0 | `signing_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| 3 | Vercel Token | API Token | P1 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| 4 | Anthropic API Key | API Key | P1 | `sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| 5 | PostgreSQL Connection String | Connection URL | P2 | `postgresql://user:pass@host:5432/database` |

---

## Credential 1: GitHub Personal Access Token

### Get It (2 minutes)

1. Open https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: `mauseai-phase-k-validation`
4. Expiration: **30 days**
5. Check these boxes only:
   - [x] `repo` (Full control of private repositories)
   - [x] `workflow` (Update GitHub Action workflows)
   - [x] `read:org` (Read org and team membership)
6. Click **"Generate token"**
7. **Copy immediately** (won't be shown again)

### Test It (30 seconds)

```bash
export GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Test 1: Verify token works
gh auth login --with-token <<< "$GITHUB_PAT"

# Test 2: Check access to repo
gh repo view hakimceliker/mauseai --json nameWithOwner

# Expected output: Repository name displays
```

### Troubleshooting

```bash
# If "permission denied": Token lacks correct scopes
# Fix: Regenerate with repo + workflow + read:org scopes

# If "not found": Token expired or invalid
# Fix: Generate new token from https://github.com/settings/tokens

# If "invalid credentials": Check for typos
# Fix: Recopy token from GitHub settings
```

---

## Credential 2: Inngest API Key

### Get It (2 minutes)

1. Open https://app.inngest.com
2. Sign in with your project credentials
3. Go to **Settings → API Keys**
4. Click **"Create API Key"**
5. Name: `phase-k-validation`
6. Scope: **Read only** (for reading workflow logs)
7. Copy the key (format: `signing_xxxxx...`)

### Test It (30 seconds)

```bash
export INNGEST_API_KEY="signing_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Test: Check API connectivity
curl -s -H "Authorization: Bearer $INNGEST_API_KEY" \
  https://api.inngest.com/v1/apps/current \
  | jq .

# Expected output: JSON response with app details
```

### Troubleshooting

```bash
# If "unauthorized": Key is invalid or expired
# Fix: Regenerate from https://app.inngest.com/settings/api-keys

# If "not found": URL is wrong
# Fix: Ensure using https://api.inngest.com (not inngest.io)

# If empty response: Key lacks read permissions
# Fix: Check scope is set to "Read only"
```

---

## Credential 3: Vercel Token

### Get It (2 minutes)

1. Open https://vercel.com/account/tokens
2. Click **"Create"**
3. Name: `mauseai-phase-k`
4. Scope: **Full Account** (needed for deployment logs)
5. Copy the token value

### Test It (30 seconds)

```bash
export VERCEL_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Test: Check account access
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/edge-configs \
  | jq '.edgeConfigs | length'

# Expected output: A number (count of edge configs)
```

### Troubleshooting

```bash
# If "forbidden": Scope is too limited
# Fix: Recreate with Full Account scope

# If "invalid token": Token expired or malformed
# Fix: Regenerate from https://vercel.com/account/tokens

# If "not found": Using wrong API endpoint
# Fix: Verify using https://api.vercel.com/v1/
```

---

## Credential 4: Anthropic API Key

### Get It (2 minutes)

1. Open https://console.anthropic.com
2. Sign in with your Anthropic account
3. Click **"API Keys"** in sidebar
4. Click **"Create Key"**
5. Name: `mauseai-phase-k-tests`
6. Copy the key (format: `sk-ant-xxxxx...`)

### Test It (30 seconds)

```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Test: Make API call
curl -s https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "test"}]
  }' | jq '.content[0].text'

# Expected output: Claude's response text
```

### Troubleshooting

```bash
# If "401 Unauthorized": API key invalid
# Fix: Regenerate from https://console.anthropic.com/api-keys

# If "invalid_request_error": Request format wrong
# Fix: Check JSON is valid: jq . <<< '{your json}'

# If timeout: Network or API issue
# Fix: Check https://status.anthropic.com
```

---

## Credential 5: PostgreSQL Connection String

### Get It (3 minutes)

**For AWS RDS:**
1. Open AWS RDS console
2. Select your database instance
3. Copy **Endpoint** (e.g., `mauseai.xxxxx.us-east-1.rds.amazonaws.com`)
4. Connection string format:
   ```
   postgresql://username:password@mauseai.xxxxx.us-east-1.rds.amazonaws.com:5432/mauseai_db
   ```

**For Supabase/Neon:**
1. Open your project dashboard
2. Find **Connection String** (usually under Settings)
3. Copy the PostgreSQL connection string
4. Format: `postgresql://username:password@host:5432/database`

**For Local Development:**
```
postgresql://postgres:password@localhost:5432/mauseai_dev
```

### Test It (30 seconds)

```bash
export DATABASE_URL="postgresql://username:password@host:5432/database"

# Test 1: Basic connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# Test 2: Check database exists
psql "$DATABASE_URL" -c "SELECT datname FROM pg_database WHERE datname = 'mauseai_db';"

# Test 3: List tables
psql "$DATABASE_URL" -c "\dt"

# Expected output: List of tables or "SELECT 1" confirmation
```

### Troubleshooting

```bash
# If "connection refused": Database not running or wrong host
# Fix: Verify host address and port (default 5432)

# If "password authentication failed": Wrong credentials
# Fix: Double-check username and password in connection string

# If "database does not exist": Wrong database name
# Fix: Check database name at end of connection string

# If "psql: command not found": PostgreSQL client not installed
# Fix: sudo apt-get install postgresql-client (Ubuntu/Debian)
#      brew install postgresql (Mac)
```

---

## Validation Commands: Test Each Credential

### Master Validation Script (Copy & Paste)

Save this as `/tmp/validate-credentials.sh`:

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "Validating All 5 Credentials"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# 1. GitHub PAT
echo "Testing GitHub PAT..."
if gh auth status 2>&1 | grep -q "Logged in"; then
  pass "GitHub authentication OK"
else
  fail "GitHub authentication failed"
fi
echo ""

# 2. Inngest API Key
echo "Testing Inngest API Key..."
if [ -z "$INNGEST_API_KEY" ]; then
  fail "INNGEST_API_KEY not set"
fi
inngest_response=$(curl -s -H "Authorization: Bearer $INNGEST_API_KEY" \
  https://api.inngest.com/v1/apps/current 2>/dev/null | grep -o '"id"' | head -1)
if [ -n "$inngest_response" ]; then
  pass "Inngest API key OK"
else
  fail "Inngest API key invalid"
fi
echo ""

# 3. Vercel Token
echo "Testing Vercel Token..."
if [ -z "$VERCEL_TOKEN" ]; then
  fail "VERCEL_TOKEN not set"
fi
vercel_response=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/teams 2>/dev/null | grep -o '"id"' | head -1)
if [ -n "$vercel_response" ]; then
  pass "Vercel token OK"
else
  fail "Vercel token invalid"
fi
echo ""

# 4. Anthropic API Key
echo "Testing Anthropic API Key..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
  fail "ANTHROPIC_API_KEY not set"
fi
anthropic_response=$(curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "test"}]
  }' 2>/dev/null | grep -o '"content"' | head -1)
if [ -n "$anthropic_response" ]; then
  pass "Anthropic API key OK"
else
  fail "Anthropic API key invalid"
fi
echo ""

# 5. PostgreSQL Connection
echo "Testing PostgreSQL Connection..."
if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL not set"
fi
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  pass "PostgreSQL connection OK"
else
  fail "PostgreSQL connection failed"
fi
echo ""

echo "=========================================="
echo "✓ All 5 credentials validated successfully"
echo "=========================================="
```

### Run It

```bash
# Set all credentials in environment
export GITHUB_PAT="ghp_..."
export INNGEST_API_KEY="signing_..."
export VERCEL_TOKEN="..."
export ANTHROPIC_API_KEY="sk-ant-..."
export DATABASE_URL="postgresql://..."

# Run validation
bash /tmp/validate-credentials.sh
```

### Expected Output

```
==========================================
Validating All 5 Credentials
==========================================

Testing GitHub PAT...
✓ GitHub authentication OK

Testing Inngest API Key...
✓ Inngest API key OK

Testing Vercel Token...
✓ Vercel token OK

Testing Anthropic API Key...
✓ Anthropic API key OK

Testing PostgreSQL Connection...
✓ PostgreSQL connection OK

==========================================
✓ All 5 credentials validated successfully
==========================================
```

---

## Setting Credentials for CI/CD

### GitHub Actions Secrets (for automated tests)

```bash
# Set each credential as a GitHub secret
gh secret set GITHUB_PAT --body "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set INNGEST_API_KEY --body "signing_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set VERCEL_TOKEN --body "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set ANTHROPIC_API_KEY --body "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/db"

# Verify secrets set
gh secret list
```

### Local Environment (.env.local)

```bash
# Create .env.local (NEVER commit this file)
cat > /home/claude/mauseai/.env.local << 'EOF'
GITHUB_PAT="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
INNGEST_API_KEY="signing_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VERCEL_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
DATABASE_URL="postgresql://user:pass@host:5432/database"
EOF

# Load credentials
source /home/claude/mauseai/.env.local

# Verify
echo "Credentials loaded: $GITHUB_PAT" | cut -c1-20
```

### Docker/Compose (for containerized testing)

```yaml
version: '3.8'
services:
  phase-k-validation:
    image: node:18
    environment:
      GITHUB_PAT: ${GITHUB_PAT}
      INNGEST_API_KEY: ${INNGEST_API_KEY}
      VERCEL_TOKEN: ${VERCEL_TOKEN}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      DATABASE_URL: ${DATABASE_URL}
    command: npm run test:phase-k
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `command not found: gh` | GitHub CLI not installed | `brew install gh` or `sudo apt install gh` |
| `command not found: curl` | curl not installed | `brew install curl` or `sudo apt install curl` |
| `command not found: psql` | PostgreSQL client not installed | `brew install postgresql` or `sudo apt install postgresql-client` |
| `Permission denied` | Token lacks required scopes | Regenerate token with all required scopes |
| `Invalid credentials` | Typo in credential value | Recopy from source, no spaces |
| `Connection refused` | Database not running | Start PostgreSQL service: `brew services start postgresql` |
| `Timeout` | Network issue | Check internet connection, test: `ping google.com` |

---

## Credential Rotation (Every 90 days)

```bash
# Step 1: Generate new credentials
# (Follow "Get It" section for each credential)

# Step 2: Update in all places
gh secret set GITHUB_PAT --body "ghp_[NEW]"
gh secret set INNGEST_API_KEY --body "signing_[NEW]"
# ... repeat for all 5

# Step 3: Test with new credentials
bash /tmp/validate-credentials.sh

# Step 4: Revoke old credentials
# - GitHub: Delete from https://github.com/settings/tokens
# - Inngest: Delete from https://app.inngest.com/settings/api-keys
# - Vercel: Delete from https://vercel.com/account/tokens
# - Anthropic: Delete from https://console.anthropic.com/api-keys
```

---

## Security Best Practices

1. **Never commit credentials** to git
2. **Use .env.local** and add to `.gitignore`:
   ```bash
   echo ".env.local" >> /home/claude/mauseai/.gitignore
   ```

3. **Rotate every 90 days** (set calendar reminder)

4. **Use different tokens per environment:**
   - Development: Lower-scope tokens
   - Production: Full-scope tokens with expiration

5. **Audit token usage:**
   ```bash
   # GitHub
   gh api repos/hakimceliker/mauseai/events?page=1 | jq '.[] | {actor: .actor.login, action: .type}'
   ```

6. **Revoke immediately if compromised:**
   ```bash
   # GitHub
   gh secret delete GITHUB_PAT
   
   # Then regenerate and re-add
   ```

---

## Credential Storage (Choose One)

### Option A: Pass Manager (Most Secure)
```bash
# Using pass (password manager)
pass insert mauseai/github-pat
pass insert mauseai/inngest-key
# ...

# Load in script
export GITHUB_PAT=$(pass mauseai/github-pat)
```

### Option B: Environment Variables (Simple)
```bash
# Add to ~/.bashrc or ~/.zshrc
export GITHUB_PAT="ghp_..."
export INNGEST_API_KEY="signing_..."
# ... (auto-loads at shell startup)
```

### Option C: 1Password/LastPass Integration
```bash
# Integrate with 1Password CLI
export GITHUB_PAT=$(op read "op://vault/mauseai/github-pat/credential")
```

---

## Quick Health Check (30 seconds)

Run this daily during Phase K:

```bash
#!/bin/bash
echo "Quick Health Check:"
echo ""
echo -n "GitHub: "
gh auth status 2>&1 | grep -q "Logged in" && echo "✓" || echo "✗"

echo -n "Inngest: "
curl -s -H "Authorization: Bearer $INNGEST_API_KEY" \
  https://api.inngest.com/v1/apps/current 2>/dev/null | \
  grep -q '"id"' && echo "✓" || echo "✗"

echo -n "Vercel: "
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/teams 2>/dev/null | \
  grep -q '"id"' && echo "✓" || echo "✗"

echo -n "Anthropic: "
curl -s -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":50,"messages":[{"role":"user","content":"test"}]}' 2>/dev/null | \
  grep -q '"content"' && echo "✓" || echo "✗"

echo -n "PostgreSQL: "
psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1 && echo "✓" || echo "✗"

echo ""
```

---

**Total Setup Time:** ~25 minutes (includes getting all 5 credentials + testing)  
**Estimated Effort:** Easy (copy-paste with browser clicks)  
**Risk Level:** Low (all credentials are read-only or limited-scope)

**Keep this guide open during Phase K for reference.**

---

**Last Updated:** 2026-10-04  
**Version:** 1.0  
**Status:** Ready to Use
