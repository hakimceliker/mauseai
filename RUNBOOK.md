# Mause AI Deployment Runbook v0.1.0

Operational guide for deploying, monitoring, and maintaining Mause AI in production.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Local Testing](#local-testing)
3. [Supabase Setup](#supabase-setup)
4. [Inngest Configuration](#inngest-configuration)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## Pre-Deployment Checklist

- [ ] Node.js 18+ installed locally
- [ ] Supabase account created
- [ ] Inngest workspace created
- [ ] All environment variables collected
- [ ] Tests passing locally (`npm test`)
- [ ] TypeScript checks passing (`npm run typecheck`)
- [ ] Linting passing (`npm run lint`)

## Local Testing

### 1. Setup Local Environment
```bash
npm install
cp .env.example .env.local
```

### 2. Configure .env.local
```env
# Get these from Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Get from Inngest dashboard
INNGEST_EVENT_KEY=sk_dev_...

# For testing
AI_PROVIDER=mock
AUTH_PROVIDER=mock
```

### 3. Start Dev Server
```bash
npm run dev
```

### 4. Test Endpoints
```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1" \
  -d '{"workflow_id": "workflow-1", "input": {}}'

# Get task status
curl http://localhost:3000/api/tasks/TASK_ID \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

### 5. Run Full Test Suite
```bash
npm run test
npm run test:ui  # Interactive UI for test results
```

## Supabase Setup

### 1. Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New project"
3. Choose region closest to your users
4. Set a strong database password
5. Wait for project initialization (2-3 minutes)

### 2. Run Migrations
In Supabase dashboard → SQL Editor:

```sql
-- Copy entire content of supabase/migrations/0001_core.sql
-- Run in SQL editor
-- Wait for completion

-- Then run 0002_idempotency.sql
```

Or use Supabase CLI:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 3. Verify Tables
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Should see:
- tenants
- users
- workflows
- steps
- tasks
- checkpoints
- audit_logs
- conversations
- messages
- offers
- idempotency_keys

### 4. Create Test Tenant
```sql
INSERT INTO tenants (id, name, monthly_limit) 
VALUES ('tenant-1'::uuid, 'Test Tenant', 1000.00);

INSERT INTO users (id, tenant_id, email) 
VALUES ('user-1'::uuid, 'tenant-1'::uuid, 'test@example.com');
```

### 5. Get API Keys
1. Dashboard → Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Inngest Configuration

### 1. Create Inngest Workspace
1. Go to [inngest.com](https://inngest.com)
2. Sign up / login
3. Create new workspace
4. Copy Event Key

### 2. Configure Environment
```env
INNGEST_EVENT_KEY=sk_prod_...
```

### 3. Setup Webhook
In Inngest dashboard:
1. Settings → Webhooks
2. Add webhook: `https://your-domain.com/api/inngest`
3. Select all events
4. Save and verify

### 4. Test Worker
Send a test event:
```bash
curl https://api.inngest.com/e/prod \
  -H "Authorization: Bearer $INNGEST_EVENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "name": "task.execute",
      "data": {
        "taskId": "test-1",
        "tenantId": "tenant-1",
        "workflowId": "workflow-1"
      }
    }]
  }'
```

## Deployment

### Option 1: Deploy to Vercel (Recommended)

#### 1. Prepare Repository
```bash
git push origin main
```

#### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Select project
4. Configure build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output: `.next`

#### 3. Set Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
INNGEST_EVENT_KEY
AI_PROVIDER (default: mock)
AUTH_PROVIDER (default: mock)
```

#### 4. Deploy
Click "Deploy" button. Vercel will build and deploy automatically.

#### 5. Update Inngest Webhook
Change webhook URL in Inngest dashboard to:
`https://your-vercel-deployment.vercel.app/api/inngest`

### Option 2: Self-Hosted (Docker)

#### 1. Build Docker Image
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. Build and Push
```bash
docker build -t mauseai:0.1.0 .
docker tag mauseai:0.1.0 your-registry/mauseai:0.1.0
docker push your-registry/mauseai:0.1.0
```

#### 3. Deploy to Cloud (e.g., AWS, GCP, Azure)
```bash
# Example: AWS ECS
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs update-service --cluster production --service mauseai --force-new-deployment
```

## Monitoring

### 1. Supabase Monitoring
- **Realtime**: Dashboard → Realtime Overview
- **Database**: Dashboard → Database → Performance Insights
- **Logs**: Dashboard → Logs → Query Performance

### 2. Inngest Monitoring
- **Executions**: Dashboard → Functions → execute-task
- **Failures**: Dashboard → Errors
- **Logs**: Click on run to view detailed logs

### 3. Application Logs
- **Vercel**: Dashboard → Deployments → Logs
- **Self-hosted**: Check container logs: `docker logs -f container-id`

### 4. Query Audit Logs
```bash
# Get last 100 events for tenant
curl "http://localhost:3000/api/audit-logs?tenant_id=tenant-1" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

### 5. Cost Tracking
```bash
# Check tenant cost usage
curl "http://localhost:3000/api/tenants/tenant-1/cost" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

## Troubleshooting

### Task Execution Fails
1. Check Inngest dashboard for error details
2. Verify AI_PROVIDER environment variable
3. Check Supabase service_role_key is correct
4. Look in audit_logs table for error messages

```sql
SELECT * FROM audit_logs 
WHERE action = 'task_failed' 
ORDER BY timestamp DESC LIMIT 10;
```

### Cost Limit Exceeded
1. Check tenant's monthly_limit in tenants table
2. Query task costs to see current usage

```sql
SELECT SUM(cost_actual) as total_cost 
FROM tasks 
WHERE tenant_id = 'tenant-1' 
AND created_at > NOW() - INTERVAL '1 month';
```

### RLS Policy Violations
Symptoms: "new row violates row-level security policy"

Solutions:
1. Verify service_role_key is used (not anon_key)
2. Check auth context has correct tenant_id
3. Verify RLS policies exist:

```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('tasks', 'workflows', 'conversations');
```

### Inngest Webhook Not Receiving Events
1. Verify webhook URL in Inngest dashboard is correct
2. Check Vercel/self-hosted logs for 404/500 errors
3. Test endpoint manually:

```bash
curl https://your-domain.com/api/inngest \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Maintenance

### Weekly Tasks
- [ ] Check Inngest error dashboard for patterns
- [ ] Review audit logs for unusual activity
- [ ] Monitor Supabase database size

### Monthly Tasks
- [ ] Review cost per tenant
- [ ] Check failed task count
- [ ] Update AI provider configuration if needed
- [ ] Test disaster recovery (database backup/restore)

### Quarterly Tasks
- [ ] Security audit of RLS policies
- [ ] Performance optimization (add indexes if needed)
- [ ] Capacity planning (approaching DB size limits?)

### Database Backup
Supabase automatically backs up daily. Access:
1. Dashboard → Settings → Backups
2. Backup recovery: click "Restore" button
3. Point-in-time recovery: Dashboard → Backups → PITR

### Scaling Considerations
- **Small workload**: Current setup handles 100s of tasks/day
- **Medium workload**: Add Supabase premium plan
- **Large workload**: Consider database read replicas + caching

## Support

- **Bugs/Features**: GitHub Issues
- **Documentation**: See README.md and ARCHITECTURE.md
- **Status Page**: [status.supabase.com](https://status.supabase.com)
- **Community**: Supabase Discord
