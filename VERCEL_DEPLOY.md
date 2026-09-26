# Vercel Deployment Guide

## Prerequisites
- Vercel account (free tier works fine)
- GitHub repository pushed to hakimceliker/mauseai
- Environment variables configured

## Option A: Automatic Deployment via Vercel Dashboard

### Step 1: Connect Repository
1. Go to https://vercel.com/new
2. Click "Select a Git Provider" and choose GitHub
3. Authorize Vercel to access your GitHub account
4. Search for "hakimceliker/mauseai"
5. Select the repository

### Step 2: Configure Project
1. Project Name: `mauseai` (or custom)
2. Framework Preset: Next.js (auto-detected)
3. Root Directory: `./ (default)`
4. Click "Continue"

### Step 3: Add Environment Variables
In the "Environment Variables" section, add:

```
NEXT_PUBLIC_APP_URL=https://mauseai.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
AI_PROVIDER=mock
```

For production, replace mock values with real Supabase and Inngest credentials.

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (3-5 minutes)
3. Your app is live at `https://mauseai.vercel.app`

### Automatic Deployments
Future pushes to `main` branch will automatically deploy.

## Option B: Deploy via CLI

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
cd /path/to/mauseai
vercel
```

Follow the prompts:
- Link to existing project? No (first time)
- Project name? mauseai
- Which directory? ./
- Auto-detect settings? Yes

### Step 4: Add Environment Variables
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add INNGEST_EVENT_KEY
vercel env add INNGEST_SIGNING_KEY
vercel env add AI_PROVIDER
```

### Step 5: Redeploy
```bash
vercel --prod
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your app URL | `https://mauseai.vercel.app` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | `eyJ...` |
| `INNGEST_EVENT_KEY` | Inngest event API key | `xx-xxx-xxx` |
| `INNGEST_SIGNING_KEY` | Inngest signing key | `xx-xxx-xxx` |
| `AI_PROVIDER` | AI provider | `mock`, `openai`, or `anthropic` |
| `OPENAI_API_KEY` | (optional) OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | (optional) Anthropic API key | `sk-ant-...` |

## Post-Deployment

### Monitor Deployment
1. Go to https://vercel.com/dashboard
2. Select "mauseai" project
3. View deployments and logs
4. Check Performance, Analytics, Real-time Logs

### View Logs
```bash
vercel logs
```

### Rollback to Previous Deployment
In Vercel Dashboard:
1. Go to Deployments tab
2. Find previous successful deployment
3. Click menu (...) → Promote to Production

## Custom Domain

### Add Custom Domain
1. Go to Vercel Dashboard
2. Select mauseai project
3. Go to Settings → Domains
4. Enter your domain (e.g., `mauseai.com`)
5. Follow DNS configuration steps

### Update Environment Variables for Custom Domain
Update `NEXT_PUBLIC_APP_URL` to use your custom domain:
```
NEXT_PUBLIC_APP_URL=https://mauseai.com
```

## Database Migrations

When deploying schema changes:

### Before Pushing to Main
```bash
# Locally test migrations
supabase migration list
```

### After Deployment to Vercel
Migrations run automatically if using Supabase migrations system.

For manual migrations:
```bash
# Via Supabase CLI
supabase db push

# Or via Supabase Dashboard → SQL Editor
```

## Troubleshooting

### Build Fails
1. Check build logs in Vercel Dashboard
2. Verify all environment variables are set
3. Check for TypeScript errors:
   ```bash
   npm run typecheck
   ```

### 404 Errors
- Ensure routes are correctly configured
- Check Next.js routing structure
- Verify API routes use `/api/` prefix

### Environment Variables Not Loaded
1. Redeploy after adding variables
2. Verify variable names match `process.env.VAR_NAME`
3. For public vars, prefix with `NEXT_PUBLIC_`

### Database Connection Issues
1. Verify Supabase credentials
2. Check Supabase project is active
3. Ensure database migrations are applied
4. Check Vercel function timeout (default 60s)

## Performance Tips

### Optimize Build
- Remove unused dependencies
- Tree-shake unused code
- Use dynamic imports for large components

### Database Queries
- Use Supabase RLS for security
- Add indexes on frequently queried columns
- Cache results when possible

### Edge Functions
- Keep functions under 50KB
- Use streaming for large responses
- Leverage caching headers

## Security

### Protect Secrets
- Never commit `.env.local`
- Use Vercel's environment variable management
- Rotate API keys regularly
- Review access logs

### CORS Configuration
If frontend and API are separate:
```typescript
// next.config.js
const nextConfig = {
  headers: async () => [{
    source: '/api/(.*)',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
    ]
  }]
};
```

## Scaling

### Auto-scaling
Vercel automatically scales based on traffic.

### Database Scaling
- Monitor Supabase usage dashboard
- Upgrade plan if hitting limits
- Optimize queries to reduce load

### Monitoring
```bash
# View real-time metrics
vercel analytics
```

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Hosting](https://supabase.com/docs/guides/hosting)
- [Inngest Docs](https://www.inngest.com/docs)
