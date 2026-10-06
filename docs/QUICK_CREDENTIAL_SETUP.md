# Quick Credential Setup Guide (5 Minutes)

This guide walks you through setting up all required credentials for local development and testing.

## Prerequisites

- Node.js 18+ installed
- `npm` available in your shell
- Access to all required credential sources (see below)

## One Command Setup

Run this to start the interactive setup:

```bash
npm run setup:credentials
```

The script will:
1. Prompt for each credential
2. Validate the format as you enter it
3. Create `.env.local` with your keys
4. Test connectivity to each service
5. Confirm everything works

**~5 minutes** from credentials → ready to test

## Credential Locations

### Supabase Configuration

Get these from your Supabase dashboard:

1. Go to [supabase.co](https://supabase.co)
2. Select your project
3. Click **Settings** → **API**
4. Copy the values below:

| Credential | Location | Format |
|------------|----------|--------|
| **Project URL** | "URL" field at top | `https://xxxxx.supabase.co` |
| **Anon Key** | "anon public" | Long string (50+ chars) |
| **Service Role Key** | "service_role secret" | Long string (50+ chars) |
| **JWT Secret** | Scroll down to "JWT Secret" | String (20+ chars) |

Example:
```
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=super-secret-jwt-key
```

### Inngest Configuration

Get this from Inngest dashboard:

1. Go to [app.inngest.com](https://app.inngest.com)
2. Select your app
3. Click **API Keys** (left sidebar)
4. Copy the "Event Key" (looks like `evt_prod_...` or `evt_test_...`)

Example:
```
INNGEST_EVENT_KEY=evt_prod_xxxxxxxxxxxxx
```

### OpenAI Configuration (Optional)

Get this from OpenAI API dashboard:

1. Go to [platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Click **Create new secret key**
3. Copy it (starts with `sk_test_` or `sk_live_`)
4. Store securely (never commit to git)

Example:
```
OPENAI_API_KEY=sk_test_xxxxxxxxxxxxxxxx
AI_PROVIDER=openai
```

### Anthropic Configuration (Optional)

Get this from Anthropic console:

1. Go to [console.anthropic.com/account/keys](https://console.anthropic.com/account/keys)
2. Click **Create Key**
3. Copy it (starts with `sk-ant-`)
4. Store securely (never commit to git)

Example:
```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

### Ollama Configuration (Optional)

For local LLM inference without API keys:

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run: `ollama serve` (default port 11434)
3. In a new terminal, pull a model: `ollama pull qwen2:7b`
4. Configure the URL:

```
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=http://localhost:11434
```

## Step-by-Step Setup

### 1. Start the Setup Script

```bash
npm run setup:credentials
```

### 2. Provide Supabase Credentials

You'll be prompted for:
- Supabase Project URL
- Supabase Anon Key (public)
- Supabase Service Role Key (secret)
- Supabase JWT Secret

**Expected validation output:**
```
✓ Supabase URL configured
✓ Supabase Anon Key configured
✓ Supabase Service Role Key configured
✓ Supabase JWT Secret configured
```

### 3. Provide Inngest Credentials

You'll be prompted for:
- Inngest Event Key

**Expected validation output:**
```
✓ Inngest Event Key configured
```

### 4. Choose AI Providers

The script will ask which AI providers you want (openai, anthropic, both, or none).

**For OpenAI:**
```
✓ OpenAI API Key configured
```

**For Anthropic:**
```
✓ Anthropic API Key configured
```

### 5. Optional: Configure Ollama

Choose whether to configure local AI (Ollama).

**Expected validation output:**
```
○ Ollama (Local AI): not configured
```
or
```
✓ Ollama (Local AI): reachable (200)
```

### 6. Automatic Connectivity Tests

The script runs tests to verify each service is reachable:

```
ℹ Running connectivity tests...

✓ Supabase: reachable (200)
✓ Inngest: reachable (401)
✓ OpenAI: reachable (200)
✓ Anthropic: reachable
○ Ollama (Local AI): not configured

✓ Credential setup complete! You're ready to run tests.
```

**Status codes explained:**
- `200` = Service fully accessible
- `401` = Service found but auth required (expected for some services)
- `Connection refused` = Service not running or unreachable
- `not configured` = Optional service skipped

## What Gets Created

After running the setup, you'll have:

```
.env.local  (DO NOT COMMIT TO GIT)
├── NEXT_PUBLIC_SUPABASE_URL
├── NEXT_PUBLIC_SUPABASE_ANON_KEY
├── SUPABASE_SERVICE_ROLE_KEY
├── SUPABASE_JWT_SECRET
├── INNGEST_EVENT_KEY
├── OPENAI_API_KEY (optional)
├── ANTHROPIC_API_KEY (optional)
└── LOCAL_AI_* (optional)
```

## Validating Credentials Later

To re-validate at any time:

```bash
npm run validate:credentials
```

Output includes JSON summary:
```json
{
  "timestamp": "2024-...",
  "results": [
    { "provider": "Supabase", "configured": true, "reachable": true },
    { "provider": "Inngest", "configured": true, "reachable": true },
    { "provider": "OpenAI", "configured": true, "reachable": true },
    { "provider": "Anthropic", "configured": false, "reachable": null }
  ]
}
```

## Running Tests with Phase C-E

Once credentials are validated:

```bash
npm run test:phase-ce
```

This runs:
1. `npm run validate:credentials` (verify all services)
2. `npm run test -- src/core/testing/` (run Phase C-E tests)

## Troubleshooting

### "Configuration missing" errors

Run setup again:
```bash
npm run setup:credentials
```

### "Cannot reach service" errors

**For Supabase:**
- Check internet connection
- Verify URL is correct (should include `.supabase.co`)
- Confirm project isn't paused

**For Inngest:**
- Check internet connection
- Verify event key isn't expired
- Try: `curl https://api.inngest.com/health`

**For OpenAI:**
- Verify API key starts with `sk_test_` or `sk_live_`
- Check quota/billing in dashboard
- Try: `curl -H "Authorization: Bearer YOUR_KEY" https://api.openai.com/v1/models`

**For Anthropic:**
- Verify API key starts with `sk-ant-`
- Check account is active
- Verify key isn't expired

**For Ollama:**
- Ensure Ollama is running: `ollama serve`
- Check port 11434 is not blocked
- Verify model is installed: `ollama list`

### Script hangs or times out

Ctrl+C to stop and check your credentials. Connectivity tests timeout after 5 seconds.

### "ts-node" not found

Install TypeScript dependencies:
```bash
npm install
```

Then run setup again.

## Security Notes

- ✅ Keys are **never printed** to logs (shown as `****`)
- ✅ `.env.local` is in `.gitignore` (never committed)
- ✅ Only store real keys in `.env.local`
- ✅ Use test keys when possible (`sk_test_...` for OpenAI)
- ❌ Never share `.env.local` or commit it to git
- ❌ Never print keys in console logs
- ❌ Never upload keys to version control

## What's Next

After credentials are set up:

### Run tests
```bash
npm test
```

### Run Phase C-E tests specifically
```bash
npm run test:phase-ce
```

### Start development server
```bash
npm run dev
```

Then open http://localhost:3000

### Verify everything
```bash
npm run verify
```

This runs: lint, typecheck, test, and build.

## Reference: Complete .env.local Example

```bash
# Auto-generated by setup-credentials.sh
# Do NOT commit this file to git

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...very-long-string...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...very-long-string...
SUPABASE_JWT_SECRET=super-secret-jwt-key-here

# Inngest Configuration
INNGEST_EVENT_KEY=evt_prod_xxxxxxxxx

# AI Provider Configuration
OPENAI_API_KEY=sk_test_xxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxx
AI_PROVIDER=openai
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=http://localhost:11434

# Application Configuration
NODE_ENV=development
AUTH_PROVIDER=mock
SUPABASE_AUTH_ENABLED=false
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
DEFAULT_USER_ID=00000000-0000-0000-0000-000000000001
```

## Still stuck?

Check the main setup script logs or run with verbose output:

```bash
bash -x scripts/setup-credentials.sh
```

This will show every command being executed.
