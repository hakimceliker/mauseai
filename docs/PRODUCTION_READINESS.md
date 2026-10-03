# Production Readiness Checklist & Deployment Guide

## Overview

This document outlines the production readiness state of MauseAI as of October 3, 2026, including CI/CD pipeline gates, credential configuration requirements, deployment procedures, and known limitations.

## Project Status

**Current Phase:** Stage 1 - Production-Ready Foundation  
**Latest Merge:** PR #96 (Main branch) - Oct 3, 2026  
**Framework:** Next.js 16.3.6  
**Runtime:** Node.js 22+  

## CI/CD Pipeline Gates

All production deployments must pass the following automated gates:

### 1. Code Quality & Testing
- **Linting:** ESLint conformance across all source files
- **Type Safety:** TypeScript strict mode checks
- **Unit Tests:** Vitest suite with >80% coverage target
- **Build:** Next.js production build verification

**Status:** ✓ Implemented in `.github/workflows/ci.yml`  
**Failure Action:** PR blocked until all checks pass

### 2. Dependency Security Audit
- **npm audit:** No high-severity vulnerabilities allowed
- **Audit Level:** `--audit-level=high`
- **Frequency:** Every PR + main branch push

**Status:** ✓ Implemented in `.github/workflows/ci.yml` (dependency-audit job)  
**Failure Action:** PR blocked; manual review required for high-level vulnerabilities

### 3. Secret Scanning
- **Tool:** Gitleaks v2
- **Scope:** Full repository history
- **Secrets Detected:** API keys, credentials, private tokens

**Status:** ✓ Implemented in `.github/workflows/ci.yml` (secret-scan job)  
**Failure Action:** Commit rejected; secrets must be rotated

### 4. Container Build Verification
- **Target:** Docker build test
- **Registry:** Local CI runner (no push in this stage)
- **Purpose:** Ensure Dockerfile is valid and app containerizes

**Status:** ✓ Implemented in `.github/workflows/ci.yml` (docker job)  
**Failure Action:** PR blocked until Dockerfile is fixed

### 5. Health Endpoint Verification (Local)
- **Endpoint:** `GET /api/health`
- **Test Mode:** Mock credentials (no production APIs called)
- **Expected Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-03T12:00:00Z",
    "credentials": {
      "supabase": "configured" | "credential_not_configured",
      "inngest": "configured" | "credential_not_configured",
      "openai": "configured" | "credential_not_configured",
      "anthropic": "configured" | "credential_not_configured"
    }
  }
  ```

**Status:** ✓ Endpoint implemented; included in smoke tests  
**Note:** CI runs in mock/dev mode; credential warnings are expected

## Credential Configuration Checklist

### Development (Local Testing)
No external credentials required. The application defaults to safe mock implementations:

```bash
# Copy environment template
cp .env.example .env.local

# Start with mocks
npm run dev
```

| Service | Dev Default | Notes |
|---------|-------------|-------|
| Supabase | Mock | In-memory storage for testing |
| Inngest | Console | Events logged to stdout |
| OpenAI | Disabled | No API calls without credentials |
| Anthropic | Disabled | No API calls without credentials |

### Production (Vercel Deployment)

Production credentials are **configured in Vercel Environment Variables** (not in code):

#### Required Variables
```text
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anon key (public)
SUPABASE_SERVICE_ROLE_KEY         # Supabase service role (secret)
INNGEST_EVENT_KEY                 # Inngest API key
INNGEST_SIGNING_KEY               # Inngest signing key
```

#### Optional Integration Variables
```text
OPENAI_API_KEY                    # For GPT-4/3.5 support
ANTHROPIC_API_KEY                 # For Claude support
POSTHOG_KEY                        # Analytics
SENTRY_DSN                         # Error tracking
LANGFUSE_PUBLIC_KEY                # LLM observability (public)
LANGFUSE_SECRET_KEY                # LLM observability (secret)
```

#### Configuration in Vercel
1. Navigate to **Project Settings → Environment Variables**
2. Add each variable with its production value
3. Select **Production** environment only
4. Deploy to trigger variable injection

#### Handling Missing Credentials
If production variables are not configured:
- App starts successfully (graceful degradation)
- Health endpoint reports `credential_not_configured` per service
- Affected features are disabled (no errors logged)
- Admin dashboard shows credential warning badge

See `docs/INTEGRATION_SETUP.md` for detailed integration setup procedures.

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] All CI checks pass (quality, audit, secret-scan, docker)
- [ ] PR approved by maintainer
- [ ] Credential list reviewed for production environment
- [ ] Rollback procedure documented (see below)

### Vercel Deployment (Primary)

#### Step 1: Merge PR to Main
```bash
# On feature branch (already tested)
git push origin feat/production-final-pipeline
# Create PR via GitHub UI
# After approval, merge to main (squash or rebase recommended)
```

#### Step 2: Automatic Deployment
Vercel automatically deploys main branch pushes to production:
- Build Command: `npm run build`
- Start Command: `next start`
- Region: `fra1` (Frankfurt, EU)

#### Step 3: Post-Deployment Verification
```bash
# Run smoke tests against production
npm run smoke:production

# Run acceptance tests
npm run acceptance:production
```

**Expected Results:**
- Health endpoint returns all services `configured` or `credential_not_configured`
- No 5xx errors in deployment logs
- Response times <2s at p99

#### Step 4: Monitor Production
- Sentry: Error tracking dashboard
- PostHog: User analytics and feature usage
- Vercel: Deployment logs and performance metrics

### Supabase Setup (One-time)

1. Create Supabase project at supabase.com
2. Note project URL and anon key from Settings → API
3. Create service role key: Settings → API → Service Role Secret
4. Add to Vercel environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://<project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon-key>
   SUPABASE_SERVICE_ROLE_KEY = <service-role-key>
   ```

### Inngest Setup (One-time)

1. Create Inngest account at inngest.com
2. Create an app in the Inngest dashboard
3. Note Event Key and Signing Key
4. Add to Vercel environment variables:
   ```
   INNGEST_EVENT_KEY = <event-key>
   INNGEST_SIGNING_KEY = <signing-key>
   ```
5. Point Inngest dashboard to webhook: `https://<your-domain>/api/inngest`

### Rollback Procedure

#### Quick Rollback (Vercel)
1. Navigate to **Deployments** in Vercel dashboard
2. Find the last successful deployment
3. Click **Promote to Production** or **Redeploy**
4. Verify health endpoint returns expected status

#### Code Rollback
1. Identify problematic commit or PR
2. Create revert PR: `git revert <commit-hash>`
3. Merge revert PR to main
4. Vercel automatically redeploys

#### Database Rollback
- Supabase: Use Supabase Migration Rollback in dashboard
- Inngest: No data rollback needed (events are immutable)

## Known Limitations

### Test Mode & Mock Implementations
- Local development uses mock versions of all external services
- No real API calls are made without explicit configuration
- Production health checks report missing credentials gracefully

### LLM API Integration
- **OpenAI:** Requires `OPENAI_API_KEY` for GPT-4/3.5 support
- **Anthropic:** Requires `ANTHROPIC_API_KEY` for Claude support
- Both are optional; app functions without them

### Time-Limited Trial Features
- Inngest trial deployments may have limitations
- Upgrade to production plan before heavy usage
- Supabase free tier has database size limits (500MB)

### Performance Constraints
- Inngest task timeout: 60 seconds maximum per function
- Next.js serverless functions: Vercel's time limits apply
- Database query timeout: Supabase default is 30 seconds

### Regional Availability
- Vercel deployment: Frankfurt region (EU/GDPR compliant)
- Supabase: Must match Vercel region for latency
- Inngest: Global; automatic routing to nearest endpoint

## Security Considerations

### Secrets Management
- **Never commit API keys** to git (gitleaks will reject)
- Use Vercel Environment Variables for production
- Rotate credentials quarterly
- Store backup credentials securely offline

### CORS & Origin Headers
- CORS is enabled for localhost:3000 (dev)
- Production must whitelist origin domain in Vercel config
- API endpoints enforce same-origin policy

### Rate Limiting
- Inngest: 100 events/sec per app (upgrade as needed)
- Supabase: Depends on plan tier
- Custom rate limiting available in middleware

### Audit Trail
- All deployments logged in Vercel dashboard
- Database changes tracked in Supabase migrations
- Error logs in Sentry (if configured)

## Next Steps

1. **Configure Production Credentials**
   - Create Supabase project and note credentials
   - Create Inngest app and note API keys
   - Add environment variables to Vercel

2. **Run Smoke Tests**
   ```bash
   npm run smoke:production
   ```

3. **Monitor Initial Deployments**
   - Check Vercel logs for errors
   - Verify health endpoint
   - Monitor Sentry for exceptions

4. **Scale as Needed**
   - Upgrade Supabase plan if approaching limits
   - Configure custom domains and SSL in Vercel
   - Set up monitoring alerts (Sentry, PostHog)

## Support & Troubleshooting

### Deployment Failures
See `docs/deploy/vercel-deployment.md` for Vercel-specific troubleshooting.

### Integration Issues
See `docs/INTEGRATION_SETUP.md` for integration-specific configuration.

### Security Concerns
See `docs/security-acceptance-report.md` for security review findings.

## Change Log

| Date | Change | PR |
|------|--------|-----|
| 2026-10-03 | Production Readiness Stage 1 | #97 |
| 2026-10-01 | Security Acceptance Report | #93 |
| 2026-09-30 | Final Integration Setup | #91 |

---

**Last Updated:** October 3, 2026  
**Authored By:** Claude Haiku 4.5  
**Status:** Production-Ready
