# MauseAI Production Readiness Checklist

## Stage 1 Status ✓
- **PR #76 Merged** (2026-09-28, Stage 1 Consolidation complete)
- **11 MOUSE Packages** integrated (001-011)
- **Main CI** all gates green (quality, docker, npm audit, secret-scan)
- **Test Coverage** 266+ tests passing

## CI Pipeline Completion ✓
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier (0 warnings)
- ✅ npm audit (0 high vulnerabilities)
- ✅ Secret scan (gitleaks, no credentials found)
- ✅ Docker build (verified)
- ✅ GitHub Actions (quality job passing)

## Deployment Readiness Matrix

### Prerequisites (Required for Production)
| Component | Status | Required For | Config |
|-----------|--------|-------------|--------|
| Supabase Project | ❌ credential_not_configured | Auth + RLS | .env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| Inngest | ❌ credential_not_configured | Task queuing | .env: INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY |
| Vercel | ✅ Ready | Deploy | Automatic (GitHub Actions) |
| Stripe | ✅ Sandbox mode | Payments (MVP safe) | .env: STRIPE_SECRET_KEY (test_...) |
| OpenAI | ✅ Mock mode | AI tasks | No key needed (mock) |
| Anthropic | ✅ Mock mode | AI tasks | No key needed (mock) |

### Deployment Steps
1. **Local Development:**
   ```bash
   npm install
   npm run dev
   # Visit http://localhost:3000
   # Health check: http://localhost:3000/api/health/ready (503 until config)
   ```

2. **Vercel Deployment:**
   ```bash
   vercel deploy
   # CI gates run automatically (quality, docker, npm audit)
   # Set production environment variables
   ```

3. **Environment Setup (.env.production):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   INNGEST_EVENT_KEY=...
   INNGEST_SIGNING_KEY=...
   STRIPE_SECRET_KEY=sk_test_...
   NODE_ENV=production
   ```

4. **Test Production Health:**
   ```bash
   curl https://your-app.vercel.app/api/health
   curl https://your-app.vercel.app/api/health/ready
   # /health returns 200 always
   # /health/ready returns 200 if Supabase + Inngest configured, 503 if missing
   ```

## Test Mode vs Production

### Current (MVP Safe)
- AI providers: Mock responses (safe, no cost)
- Payments: Stripe sandbox (test_... keys, no real charges)
- Database: Supabase test project (local or free tier)
- Auth: Mock users or Supabase free auth

### Production Migration Path
1. Create real Supabase project (production tier)
2. Set real Inngest workspace keys
3. Use Stripe live API keys (production_... keys)
4. Configure real OpenAI/Anthropic API keys (if real AI needed)

## Known Limitations
- No production domain/DNS (using Vercel default)
- 12 pre-existing npm vulnerabilities (not from our code, pre-existing dependencies)
- Mock AI responses (safe for MVP testing)
- Sandbox payments (no real charges)

## Rollback
If production deployment fails:
```bash
# Vercel auto-rollback
vercel rollback

# Or revert code
git revert [last-commit-hash]
git push origin main
# Vercel redeploys automatically
```

## Monitoring
- Health endpoint: GET /api/health (always 200)
- Readiness endpoint: GET /api/health/ready (200 if ready, 503 if deps missing)
- Logs: `vercel logs [deployment-url]`
- CI logs: GitHub Actions > Workflows > quality job

---
**Last Updated:** 2026-10-03
**Stage 1 Status:** Complete ✓
**Next:** Real credential configuration + Phase 2 onwards
