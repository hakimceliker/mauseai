# Integration Setup Guide

This document explains how to configure external integrations for the MauseAI application. All integrations are environment-based and support development/testing with safe defaults.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Overview](#integration-overview)
3. [Payment Integration](#payment-integration)
4. [Real-time/WebSocket Integration](#real-timewebsocket-integration)
5. [Notification Integration](#notification-integration)
6. [Analytics Integration](#analytics-integration)
7. [Health Checks](#health-checks)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### Development Setup (No External Accounts Needed)

The application defaults to safe mock/console implementations:

```bash
# Copy environment template
cp .env.example .env.local

# No additional configuration needed
# All integrations will use mock implementations
npm run dev
```

### Production Setup

For production, you'll need external accounts and credentials. See specific integration sections below.

## Integration Overview

| Integration | Required? | Default | Production Options | Setup Time |
|-------------|-----------|---------|-------------------|-----------|
| Payment | No | Mock | Stripe, Square | 30 min |
| Real-time | Yes* | Supabase | Supabase | N/A (already configured) |
| Notifications | No | Console | Email, Slack | 15 min |
| Analytics | No | Console | Mixpanel, Segment | 20 min |

*Real-time is required for core app functionality but uses existing Supabase setup.

## Payment Integration

### Location

- Interface: `src/lib/integrations/payment-provider.ts`
- Adapter: `src/lib/integrations/payment-adapter.ts`

### Development (Default)

Uses mock provider - no configuration needed.

```bash
# .env.local - default for development
PAYMENT_PROVIDER_TYPE=mock
```

### Stripe Setup

#### 1. Create Stripe Account

- Go to https://stripe.com
- Sign up and create an account
- Verify email and set up your business

#### 2. Get API Keys

- Navigate to Dashboard > Developers > API Keys
- Copy **Secret Key** (starts with `sk_live_` or `sk_test_`)
- Copy **Webhook Secret** from Developers > Webhooks

#### 3. Configure Application

```bash
# .env.local (NEVER commit this file)
PAYMENT_PROVIDER_TYPE=stripe
PAYMENT_API_KEY=sk_test_YOUR_SECRET_KEY
PAYMENT_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

#### 4. Test

```bash
curl http://localhost:3000/api/health
# Should show: "payment": { "status": "ready", "provider": "stripe" }
```

### Square Setup

#### 1. Create Square Account

- Go to https://squareup.com
- Sign up and create an account
- Verify email and business info

#### 2. Get API Keys

- Navigate to Developer Dashboard > Credentials
- Copy **Access Token** (production token for live credentials)
- Copy **Webhook Signing Key** from Webhooks section

#### 3. Configure Application

```bash
# .env.local
PAYMENT_PROVIDER_TYPE=square
PAYMENT_API_KEY=sq_live_YOUR_ACCESS_TOKEN
PAYMENT_WEBHOOK_SECRET=YOUR_WEBHOOK_SIGNING_KEY
```

#### 4. Test

```bash
curl http://localhost:3000/api/health
# Should show: "payment": { "status": "ready", "provider": "square" }
```

### Usage Example

```typescript
import { getPaymentAdapter } from '@/src/lib/integrations';

const paymentAdapter = getPaymentAdapter();

// Process payment
const transaction = await paymentAdapter.processPayment(
  9999, // $99.99 in cents
  'USD',
  'customer_123',
  'Order #123'
);

// Refund payment
const refund = await paymentAdapter.refund(transaction.id, 5000); // Partial refund

// Check balance
const balance = await paymentAdapter.checkBalance();
```

## Real-time/WebSocket Integration

### Location

- Interface: `src/lib/integrations/realtime-provider.ts`

### Current Implementation

Uses **Supabase Realtime** via existing Supabase configuration.

Credentials are already set up in `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

No additional setup needed.

### Usage Example

```typescript
import { getRealtimeProvider } from '@/src/lib/integrations';

const realtime = getRealtimeProvider();
await realtime.connect();

// Subscribe to channel
const subscription = await realtime.subscribe('tasks:123');

subscription.onMessage((message) => {
  console.log('Task updated:', message.data);
});

// Broadcast update
await realtime.broadcast('tasks:123', 'update', {
  status: 'completed',
  timestamp: new Date(),
});
```

### Future Providers

The interface supports alternative implementations (Socket.io, Firebase Realtime, etc.). To add a new provider:

1. Implement `IRealtimeProvider` interface
2. Add to provider selection in `src/lib/integrations/realtime-provider.ts`
3. Add `REALTIME_PROVIDER` environment variable

## Notification Integration

### Location

- Interface: `src/lib/integrations/notification-provider.ts`

### Development (Default)

Uses console provider - logs all notifications instead of sending.

```bash
# .env.local - default for development
NOTIFICATION_TYPE=console
```

### Email Setup

#### 1. Choose Email Provider

Popular options:
- **SendGrid** - Most popular, generous free tier
- **AWS SES** - Part of AWS, lowest cost at scale
- **Mailgun** - Developer-friendly, good for testing
- **Postmark** - Premium option, best for transactional email

#### 2. SendGrid (Recommended for Startups)

##### Create Account & Get API Key

- Go to https://sendgrid.com
- Sign up for free account
- Verify email
- Navigate to Settings > API Keys
- Create new API Key with full access
- Copy the key (starts with `SG.`)

##### Configure Application

```bash
# .env.local
NOTIFICATION_TYPE=email
EMAIL_PROVIDER_KEY=SG_YOUR_API_KEY
```

##### Test

```bash
curl http://localhost:3000/api/health
# Should show: "notifications": { "status": "ready", "type": "email" }
```

### Slack Setup

#### 1. Create Slack Workspace or Use Existing

- Go to https://slack.com
- Create workspace or use existing one

#### 2. Create Incoming Webhook

- Go to https://api.slack.com/apps
- Click "Create New App"
- Choose "From scratch"
- Name: "MauseAI" (or your project name)
- Workspace: Select your workspace
- Enable **Incoming Webhooks**
- Click "Add New Webhook to Workspace"
- Select channel (e.g., `#notifications`)
- Authorize
- Copy Webhook URL (starts with `https://hooks.slack.com/services/`)

#### 3. Configure Application

```bash
# .env.local
NOTIFICATION_TYPE=slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### 4. Test

```bash
curl http://localhost:3000/api/health
# Should show: "notifications": { "status": "ready", "type": "slack" }
```

### Usage Example

```typescript
import { getNotificationAdapter } from '@/src/lib/integrations';

const notifier = getNotificationAdapter();

// Send email
await notifier.sendEmail({
  to: 'user@example.com',
  subject: 'Task Completed',
  body: 'Your task has been completed successfully.',
});

// Send Slack message
await notifier.sendSlack({
  channel: '#notifications',
  text: 'New task assigned to you',
});
```

## Analytics Integration

### Location

- Interface: `src/lib/integrations/analytics-provider.ts`

### Development (Default)

Uses console provider - logs all events to console.

```bash
# .env.local - default for development
ANALYTICS_TYPE=console
```

### Mixpanel Setup

#### 1. Create Account

- Go to https://mixpanel.com
- Sign up for free account
- Create a new project
- Note the **Project Token**

#### 2. Get API Key

- Navigate to Project Settings
- Copy **Project Token** (this is your API key)

#### 3. Configure Application

```bash
# .env.local
ANALYTICS_TYPE=mixpanel
ANALYTICS_API_KEY=YOUR_PROJECT_TOKEN
```

#### 4. Test

```bash
curl http://localhost:3000/api/health
# Should show: "analytics": { "status": "ready", "type": "mixpanel" }
```

### Segment Setup

#### 1. Create Account

- Go to https://segment.com
- Sign up for free account
- Create a new workspace

#### 2. Add Source

- Click "Add Source"
- Select "Website" or "Server"
- Create source and get **Write Key**

#### 3. Configure Application

```bash
# .env.local
ANALYTICS_TYPE=segment
ANALYTICS_API_KEY=YOUR_WRITE_KEY
```

#### 4. Test

```bash
curl http://localhost:3000/api/health
# Should show: "analytics": { "status": "ready", "type": "segment" }
```

### Usage Example

```typescript
import { getAnalyticsAdapter } from '@/src/lib/integrations';

const analytics = getAnalyticsAdapter();

// Track event
await analytics.trackEvent({
  name: 'task_completed',
  userId: 'user_123',
  properties: {
    taskId: 'task_456',
    duration: 3600, // seconds
  },
});

// Track user
await analytics.trackUser({
  userId: 'user_123',
  email: 'user@example.com',
  name: 'John Doe',
  role: 'admin',
});

// Track page view
await analytics.trackPage({
  path: '/tasks',
  title: 'Tasks Dashboard',
  userId: 'user_123',
});
```

## Health Checks

The application provides health check endpoints for monitoring:

### GET /api/health

Returns detailed health status including integration status.

```bash
curl http://localhost:3000/api/health
```

Response (healthy):

```json
{
  "status": "healthy",
  "timestamp": "2024-09-26T10:30:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "integrations": {
    "payment": { "status": "ready", "provider": "mock" },
    "notifications": { "status": "ready", "type": "console" },
    "analytics": { "status": "ready", "type": "console" },
    "realtime": { "status": "connected", "connected": true }
  }
}
```

### HEAD /api/health

Lightweight readiness check. Returns 200 if service is ready.

```bash
curl -I http://localhost:3000/api/health
```

## Security Best Practices

### 1. Environment Variables

**NEVER commit secrets to git:**

```bash
# ✅ CORRECT - Use .env.local (in .gitignore)
PAYMENT_API_KEY=sk_test_xxx

# ❌ WRONG - Never commit to git
git add .env.local  # DO NOT DO THIS

# ❌ WRONG - Never hardcode in code
const apiKey = "sk_test_xxx";
```

### 2. File Structure

```
.env.example          # ✅ OK to commit - template with placeholder values
.env.local            # ❌ NEVER commit - contains real credentials
.env.production       # ❌ NEVER commit - contains production credentials
.gitignore            # Must include .env.local, .env.*.local
```

### 3. .gitignore Configuration

```bash
# .gitignore
.env.local
.env.*.local
.env.production
.env.staging
```

### 4. Credential Rotation

- Rotate credentials regularly (every 3-6 months)
- Immediately rotate if leaked or exposed
- Keep old credentials for brief period during rotation
- Log all credential changes

### 5. Webhook Security

- Verify webhook signatures before processing
- Use webhook signing keys, never just check source IP
- Implement rate limiting on webhook endpoints
- Log all webhook calls for audit trail

### 6. Production Deployment

For production deployment on platforms like Vercel, Heroku, etc.:

1. Use platform's secrets management (not .env files)
2. Set each environment variable in deployment settings
3. Never paste secrets in deployment logs
4. Use separate credentials for each environment (dev, staging, prod)
5. Enable audit logging

Example (Vercel):

```bash
# In Vercel Dashboard:
Settings > Environment Variables
Add: PAYMENT_API_KEY = sk_live_xxx
Add: SLACK_WEBHOOK_URL = https://hooks.slack.com/...
```

## Troubleshooting

### Payment Integration Issues

**Error: "Payment provider not configured. Set PAYMENT_API_KEY"**

- Check that `PAYMENT_PROVIDER_TYPE` is set to `stripe` or `square`
- Check that `PAYMENT_API_KEY` is set in `.env.local`
- Verify key format (Stripe starts with `sk_`, Square is alphanumeric)
- Restart development server after changing `.env.local`

**Solution:**

```bash
# .env.local
PAYMENT_PROVIDER_TYPE=stripe
PAYMENT_API_KEY=sk_test_YOUR_KEY

# Restart
npm run dev
```

### Notification Issues

**Console notifications not appearing**

- Check Node.js console/terminal for logs
- May need to run with increased verbosity: `DEBUG=* npm run dev`

**Email not sending**

- Verify `EMAIL_PROVIDER_KEY` is set
- Check email provider's API status (sendgrid.status.io)
- Verify sender email is verified in provider
- Check spam folder

**Slack not receiving messages**

- Verify webhook URL starts with `https://hooks.slack.com/`
- Test with curl: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL`
- Check Slack workspace notification settings
- Verify webhook is active (not revoked)

### Analytics Issues

**Events not appearing in Mixpanel/Segment**

- Verify `ANALYTICS_API_KEY` is correct
- Check analytics provider's event stream
- Allow 1-2 minutes for events to appear
- Check for errors in browser console or server logs

### Health Check Issues

**Health endpoint returns "degraded" status**

```json
{
  "status": "degraded",
  "integrations": {
    "payment": { "status": "error" }
  }
}
```

This is expected if you haven't configured that integration. To fix:

- Either configure the integration (see setup sections above)
- Or ignore in production if integration is optional

**Health endpoint returns "unhealthy"**

- Check error logs for specific failing integration
- Run health check in development first
- Verify all required environment variables are set
- Check external service status (Stripe, Slack, etc.)

## Examples

### Complete Development Setup

```bash
# .env.local for full development
cp .env.example .env.local

# All defaults use mock/console implementations - no credentials needed
npm run dev
```

### Production Setup (All Integrations)

```bash
# .env.local (or set in deployment platform)

# Stripe for payments
PAYMENT_PROVIDER_TYPE=stripe
PAYMENT_API_KEY=sk_live_xxx

# SendGrid for email notifications
NOTIFICATION_TYPE=email
EMAIL_PROVIDER_KEY=SG_xxx

# Slack for important alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Mixpanel for analytics
ANALYTICS_TYPE=mixpanel
ANALYTICS_API_KEY=your_project_token

# Supabase realtime (already configured in .env.example)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## FAQ

**Q: Do I need to configure all integrations?**

A: No. Only Real-time is required (uses Supabase). Others are optional and default to safe mock implementations.

**Q: Can I use different providers than listed?**

A: Yes! The interface allows plugging in alternative providers. See the provider implementations for examples.

**Q: How do I migrate from mock to real provider?**

A: Update `PROVIDER_TYPE` env var and add API key in `.env.local`. Restart server. Code doesn't need to change.

**Q: Is it safe to use console notifications in production?**

A: Not recommended. Console notifications only log, they don't actually send. Use real providers (Email, Slack) in production.

**Q: How often should I rotate credentials?**

A: Every 3-6 months as standard practice. Immediately if exposed.

**Q: Can I use multiple notification channels simultaneously?**

A: Currently, set one type per `NOTIFICATION_TYPE`. Multi-channel support is a TODO (see code comments).

## Getting Help

- Check application logs: `npm run dev` and look for `[PROVIDER]` prefixed messages
- Verify environment variables: `env | grep -i payment` (don't display actual keys)
- Test API keys with provider's CLI tools
- Check provider documentation for key format and requirements
