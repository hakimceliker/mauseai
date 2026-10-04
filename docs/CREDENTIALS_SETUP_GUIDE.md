# Credential Setup Guide for Phase C-E

**IMPORTANT:** Never commit credentials. Use environment variables or secure vaults.

## Phase C - Auth Provider Setup

### Quickstart: Auth0 (Recommended)
1. Visit https://auth0.com/signup
2. Create account/application
3. In Dashboard → Applications → Your App:
   - Copy "Domain" (e.g., dev-xxxxx.us.auth0.com)
   - Copy "Client ID"
   - Copy "Client Secret"
4. Store in environment:
   ```bash
   export AUTH0_DOMAIN='dev-xxxxx.us.auth0.com'
   export AUTH0_CLIENT_ID='...'
   export AUTH0_CLIENT_SECRET='...'
   ```
5. Test with: `npm run test:phase-c`

## Phase D - Inngest Setup

### Quickstart
1. Visit https://inngest.com/sign-up
2. Create workspace
3. Copy API Key from dashboard
4. Store in environment:
   ```bash
   export INNGEST_API_KEY='...'
   export INNGEST_SIGNING_KEY='...'
   ```
5. Test with: `npm run test:phase-d`

## Phase E - Provider Setup

### OpenAI
1. Visit https://platform.openai.com/account/api-keys
2. Create API key
3. `export OPENAI_API_KEY='sk-...'`

### Anthropic
Already configured (this project uses Anthropic Claude)

### Ollama (Local, No Key Needed)
1. Download from https://ollama.ai
2. Run: `ollama serve`
3. `export OLLAMA_URL='http://localhost:11434'`

### Datadog (Optional Observability)
1. Visit https://app.datadoghq.com/organization/settings/api-keys
2. Create API key
3. `export DATADOG_API_KEY='...'`
   `export DATADOG_APP_KEY='...'`

## Environment File Template

Create `.env.test` (DO NOT COMMIT):
```bash
# Phase C - Auth
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

# Phase D - Inngest
INNGEST_API_KEY=...
INNGEST_SIGNING_KEY=...

# Phase E - Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_URL=http://localhost:11434
DATADOG_API_KEY=...

# Test mode flag
TEST_MODE=true
REDACT_EVIDENCE=true
```

## Verification

After setup:
```bash
source .env.test
npm run test:phase-c
npm run test:phase-d
npm run test:phase-e
```

All should PASS.
