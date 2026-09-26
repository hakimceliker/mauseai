# MauseAI Integration Setup Guide

**Project:** MauseAI v0.1.0  
**Purpose:** Configure external service integrations for production deployment  
**Status:** All integration stubs ready for configuration

---

## Overview

MauseAI uses a **factory pattern** for external integrations, allowing easy switching between providers. All integrations currently use mock implementations for MVP development. To enable real functionality, configure the environment variables below.

---

## Payment Integration (Stripe or Square)

### Current Status
- **Implementation:** Factory pattern ready
- **Mock Provider:** Enabled by default (MockPaymentProvider)
- **Files:** 
  - `/src/lib/integrations/payment.ts` - Provider interface
  - `/src/lib/integrations/stripe.ts` - Stripe implementation
  - `/src/lib/integrations/square.ts` - Square implementation

### To Enable Stripe Payments

1. **Create Stripe Account**
   - Go to https://dashboard.stripe.com/register
   - Create a new account or sign in
   - Navigate to API Keys (Developers > API Keys)

2. **Configure Environment Variables**

   **For development (.env.local):**
   ```bash
   PAYMENT_PROVIDER=stripe
   STRIPE_API_KEY=sk_test_XXXXXXX...  # Test secret key
   STRIPE_PUBLIC_KEY=pk_test_XXXXXXX...  # Test publishable key
   STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXX...  # Webhook secret for events
   ```

   **For production (.env.production):**
   ```bash
   PAYMENT_PROVIDER=stripe
   STRIPE_API_KEY=sk_live_XXXXXXX...  # Live secret key
   STRIPE_PUBLIC_KEY=pk_live_XXXXXXX...  # Live publishable key
   STRIPE_WEBHOOK_SECRET=whsec_live_XXXXXXX...  # Live webhook secret
   ```

3. **Configure in Vercel**
   - Go to Vercel project settings
   - Environment Variables section
   - Add all STRIPE_* variables for production
   - Redeploy

4. **Test Stripe Integration**
   ```bash
   npm test -- integration/payment.test.ts
   ```

5. **Production Webhook Setup**
   - In Stripe Dashboard > Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `charge.succeeded`, `charge.failed`, `customer.subscription.created`
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### To Enable Square Payments

1. **Create Square Account**
   - Go to https://squareup.com/signup
   - Create account
   - Navigate to Developer Dashboard

2. **Configure Environment Variables**

   **For development:**
   ```bash
   PAYMENT_PROVIDER=square
   SQUARE_API_KEY=sq_test_XXXXXXX...
   SQUARE_APPLICATION_ID=sq_app_test_XXXXXXX...
   SQUARE_LOCATION_ID=location_XXXXXXX...
   ```

   **For production:**
   ```bash
   PAYMENT_PROVIDER=square
   SQUARE_API_KEY=sq_live_XXXXXXX...
   SQUARE_APPLICATION_ID=sq_app_live_XXXXXXX...
   SQUARE_LOCATION_ID=location_XXXXXXX...
   ```

3. **Test Square Integration**
   ```bash
   npm test -- integration/payment.test.ts
   ```

### Payment Provider Implementation Details

**Location:** `/src/lib/integrations/payment.ts`

```typescript
interface PaymentProvider {
  createCharge(params: ChargeParams): Promise<Transaction>
  refund(transactionId: string): Promise<void>
  getBalance(): Promise<BalanceInfo>
}

interface ChargeParams {
  amount: number
  currency: string
  customerId: string
  description: string
  metadata?: Record<string, string>
}

interface Transaction {
  id: string
  amount: number
  status: 'succeeded' | 'failed' | 'pending'
  timestamp: Date
}
```

---

## Email Integration (SendGrid or Mailgun)

### Current Status
- **Implementation:** Factory pattern ready
- **Mock Provider:** Enabled by default (MockEmailProvider)
- **Files:**
  - `/src/lib/integrations/email.ts` - Provider interface
  - `/src/lib/integrations/sendgrid.ts` - SendGrid implementation
  - `/src/lib/integrations/mailgun.ts` - Mailgun implementation

### To Enable SendGrid Email

1. **Create SendGrid Account**
   - Go to https://sendgrid.com/signup
   - Create account and verify email
   - Navigate to Settings > API Keys

2. **Create API Key**
   - Click "Create API Key"
   - Select "Full Access"
   - Copy the key (you won't see it again)

3. **Configure Environment Variables**

   **For development (.env.local):**
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.XXXXXXX...
   EMAIL_FROM_ADDRESS=noreply@mauseai.example.com
   EMAIL_FROM_NAME=MauseAI
   ```

   **For production (.env.production):**
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.XXXXXXX...
   EMAIL_FROM_ADDRESS=hello@mauseai.app
   EMAIL_FROM_NAME=MauseAI
   ```

4. **Verify Sender Email**
   - In SendGrid > Settings > Sender Authentication
   - Add sender domain or email address
   - Complete verification steps

5. **Test Email Integration**
   ```bash
   npm test -- integration/email.test.ts
   ```

6. **Configure in Vercel**
   - Add `SENDGRID_API_KEY` to production environment variables

### To Enable Mailgun Email

1. **Create Mailgun Account**
   - Go to https://www.mailgun.com/
   - Sign up for free tier
   - Navigate to API section

2. **Get Credentials**
   - API Key: Shown in API section
   - Domain: Default domain format: `sandboxxxx.mailgun.org`

3. **Configure Environment Variables**

   **For development:**
   ```bash
   EMAIL_PROVIDER=mailgun
   MAILGUN_API_KEY=key-XXXXXXX...
   MAILGUN_DOMAIN=sandboxxxx.mailgun.org
   EMAIL_FROM_ADDRESS=noreply@sandboxxxx.mailgun.org
   ```

   **For production:**
   ```bash
   EMAIL_PROVIDER=mailgun
   MAILGUN_API_KEY=key-XXXXXXX...
   MAILGUN_DOMAIN=mg.mauseai.app
   EMAIL_FROM_ADDRESS=hello@mg.mauseai.app
   ```

4. **Add Custom Domain (Production)**
   - In Mailgun > Domain Management
   - Add domain: `mg.mauseai.app`
   - Add DNS records as instructed
   - Wait for verification

5. **Test Email Integration**
   ```bash
   npm test -- integration/email.test.ts
   ```

### Email Provider Implementation Details

**Location:** `/src/lib/integrations/email.ts`

```typescript
interface EmailProvider {
  send(params: EmailParams): Promise<void>
  sendBatch(messages: EmailMessage[]): Promise<void>
  getStatus(messageId: string): Promise<EmailStatus>
}

interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  metadata?: Record<string, string>
}

interface EmailStatus {
  messageId: string
  status: 'delivered' | 'bounced' | 'failed' | 'pending'
  timestamp: Date
}
```

---

## Slack Integration

### Current Status
- **Implementation:** Ready for webhook configuration
- **Mock Provider:** Enabled by default
- **Files:** `/src/lib/integrations/notification.ts`

### To Enable Slack Notifications

1. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Click "Create New App"
   - Choose "From scratch"
   - Name: "MauseAI"
   - Select your workspace

2. **Configure Permissions**
   - In "OAuth & Permissions" > "Scopes"
   - Add Bot Token Scopes:
     - `chat:write` - Post messages
     - `chat:write.public` - Post in public channels
     - `files:write` - Upload files
     - `reactions:write` - Add reactions

3. **Get Bot Token**
   - In "OAuth & Permissions" > "OAuth Tokens for Your Workspace"
   - Copy "Bot User OAuth Token" (starts with `xoxb-`)

4. **Configure Environment Variables**

   **For development (.env.local):**
   ```bash
   NOTIFICATION_PROVIDER=slack
   SLACK_BOT_TOKEN=xoxb-XXXXXXX...
   SLACK_SIGNING_SECRET=XXXXXXX...  # From "Basic Information"
   SLACK_CHANNEL_ALERTS=#mauseai-alerts
   SLACK_CHANNEL_NOTIFICATIONS=#mauseai-notifications
   ```

   **For production (.env.production):**
   ```bash
   NOTIFICATION_PROVIDER=slack
   SLACK_BOT_TOKEN=xoxb-XXXXXXX...
   SLACK_SIGNING_SECRET=XXXXXXX...
   SLACK_CHANNEL_ALERTS=#mauseai-alerts
   SLACK_CHANNEL_NOTIFICATIONS=#mauseai-notifications
   ```

5. **Install App to Workspace**
   - In Slack app settings > "Install App"
   - Click "Install to Workspace"
   - Grant permissions

6. **Configure Webhook for Events**
   - Go to "Event Subscriptions"
   - Enable "Subscribe to bot events"
   - Request URL: `https://yourdomain.com/api/webhooks/slack`
   - Select events: `app_mention`, `message.channels`
   - Save

7. **Test Slack Integration**
   ```bash
   npm test -- integration/notification.test.ts
   ```

### Slack Provider Implementation Details

**Location:** `/src/lib/integrations/notification.ts`

```typescript
interface SlackParams {
  channel: string
  text: string
  blocks?: Block[]  // Slack Block Kit
  threadTs?: string  // For threaded messages
}

// Usage in code:
const slack = createNotificationProvider()
await slack.sendSlackMessage({
  channel: '#mauseai-alerts',
  text: 'User signed up: user@example.com',
  blocks: [...]
})
```

---

## Analytics Integration (Mixpanel or Segment)

### Current Status
- **Implementation:** Factory pattern ready
- **Mock Provider:** Enabled by default (MockAnalyticsProvider)
- **Files:** `/src/lib/integrations/analytics.ts`

### To Enable Mixpanel Analytics

1. **Create Mixpanel Account**
   - Go to https://mixpanel.com/register
   - Create account and project
   - Navigate to Project Settings > Access Keys

2. **Get Project Token**
   - Copy "Project Token" from settings

3. **Configure Environment Variables**

   **For both development and production:**
   ```bash
   ANALYTICS_PROVIDER=mixpanel
   MIXPANEL_TOKEN=XXXXXXX...
   MIXPANEL_BATCH_SIZE=50
   MIXPANEL_FLUSH_INTERVAL=30000
   ```

4. **Test Analytics Integration**
   ```bash
   npm test -- integration/analytics.test.ts
   ```

5. **Verify Event Tracking**
   - Open Mixpanel project
   - Go to "Data Management" > "Events"
   - You should see events appearing

### To Enable Segment Analytics

1. **Create Segment Workspace**
   - Go to https://app.segment.com/signup
   - Create workspace and source
   - Navigate to API keys

2. **Get Write Key**
   - Copy "Write Key" from source settings

3. **Configure Environment Variables**

   ```bash
   ANALYTICS_PROVIDER=segment
   SEGMENT_WRITE_KEY=XXXXXXX...
   SEGMENT_BATCH_SIZE=50
   SEGMENT_FLUSH_INTERVAL=30000
   ```

4. **Test Analytics Integration**
   ```bash
   npm test -- integration/analytics.test.ts
   ```

### Analytics Provider Implementation Details

**Location:** `/src/lib/integrations/analytics.ts`

```typescript
interface AnalyticsEvent {
  userId: string
  event: string
  properties?: Record<string, any>
  timestamp?: Date
}

interface AnalyticsProvider {
  track(event: AnalyticsEvent): Promise<void>
  identify(userId: string, traits: Record<string, any>): Promise<void>
  page(props: PageView): Promise<void>
}

// Usage in code:
const analytics = createAnalyticsProvider()
await analytics.track({
  userId: 'user-123',
  event: 'Task Created',
  properties: {
    taskType: 'goal',
    phase: 1
  }
})
```

---

## Realtime Integration (Supabase, Pusher, or Redis)

### Current Status
- **Default:** Supabase Realtime (already configured)
- **Implementation:** Factory pattern ready
- **Files:** `/src/lib/integrations/realtime.ts`

### Supabase Realtime (Default - Already Configured)

Supabase Realtime is already integrated and working. It uses:
- PostgreSQL LISTEN/NOTIFY under the hood
- Channel subscription for real-time updates
- Built into the Supabase client

**No additional setup required** - Supabase Realtime is active.

### To Switch to Pusher Realtime

1. **Create Pusher Account**
   - Go to https://pusher.com/
   - Sign up and create app
   - Navigate to App Keys

2. **Get Credentials**
   - App ID, Key, Secret, Cluster

3. **Configure Environment Variables**

   ```bash
   REALTIME_PROVIDER=pusher
   PUSHER_APP_ID=XXXXXXX...
   PUSHER_KEY=XXXXXXX...
   PUSHER_SECRET=XXXXXXX...
   PUSHER_CLUSTER=mt1
   ```

4. **Test Realtime Integration**
   ```bash
   npm test -- integration/realtime.test.ts
   ```

### To Switch to Redis Realtime

1. **Set Up Redis Instance**
   - Use Redis Cloud (https://redis.com/try-free/) or self-hosted
   - Get connection string

2. **Configure Environment Variables**

   ```bash
   REALTIME_PROVIDER=redis
   REDIS_URL=redis://:password@host:port/db
   REDIS_CHANNEL_PREFIX=mauseai:
   ```

3. **Test Realtime Integration**
   ```bash
   npm test -- integration/realtime.test.ts
   ```

---

## Environment Variables Checklist

### Essential (Already Configured in MVP)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- ✅ `DATABASE_URL` - PostgreSQL connection string (from Supabase)

### Optional Payment (Choose One Provider)
- `PAYMENT_PROVIDER` - "stripe", "square", or "mock"
- `STRIPE_API_KEY` - For Stripe
- `STRIPE_PUBLIC_KEY` - For Stripe
- `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- `SQUARE_API_KEY` - For Square
- `SQUARE_APPLICATION_ID` - For Square
- `SQUARE_LOCATION_ID` - For Square

### Optional Email (Choose One Provider)
- `EMAIL_PROVIDER` - "sendgrid", "mailgun", or "mock"
- `SENDGRID_API_KEY` - For SendGrid
- `MAILGUN_API_KEY` - For Mailgun
- `MAILGUN_DOMAIN` - For Mailgun
- `EMAIL_FROM_ADDRESS` - Sender email address
- `EMAIL_FROM_NAME` - Sender display name

### Optional Slack
- `NOTIFICATION_PROVIDER` - "slack" or "mock"
- `SLACK_BOT_TOKEN` - Slack app bot token
- `SLACK_SIGNING_SECRET` - Slack app signing secret
- `SLACK_CHANNEL_ALERTS` - Slack channel for alerts
- `SLACK_CHANNEL_NOTIFICATIONS` - Slack channel for notifications

### Optional Analytics (Choose One Provider)
- `ANALYTICS_PROVIDER` - "mixpanel", "segment", or "mock"
- `MIXPANEL_TOKEN` - For Mixpanel
- `MIXPANEL_BATCH_SIZE` - Batch size (default: 50)
- `MIXPANEL_FLUSH_INTERVAL` - Flush interval in ms (default: 30000)
- `SEGMENT_WRITE_KEY` - For Segment
- `SEGMENT_BATCH_SIZE` - Batch size (default: 50)
- `SEGMENT_FLUSH_INTERVAL` - Flush interval in ms (default: 30000)

### Optional Realtime (Choose One Provider)
- `REALTIME_PROVIDER` - "supabase" (default), "pusher", or "redis"
- `PUSHER_APP_ID` - For Pusher
- `PUSHER_KEY` - For Pusher
- `PUSHER_SECRET` - For Pusher
- `PUSHER_CLUSTER` - For Pusher
- `REDIS_URL` - For Redis
- `REDIS_CHANNEL_PREFIX` - Redis channel prefix (default: "mauseai:")

---

### Optional A–Z Channels and Ingestion (diagram cards C, G, N, O)

These variables unlock A–Z features that are reported as unavailable until they are set. Nothing is faked when they are missing: `GET /api/channels` shows `requires_credentials`, publishing returns `channel_not_configured`, and notifications are stored with `skipped_channel_not_configured`.

| Variable | Card | Effect when missing |
|---|---|---|
| `INGEST_WEBHOOK_SECRET` | G | `POST /api/ingest/webhook/{sourceId}` answers 503 `secret_not_configured` |
| `EMAIL_PROVIDER_KEY` | C, N, O | e-posta kanalı `requires_credentials` |
| `SLACK_WEBHOOK_URL`, `SLACK_SIGNING_SECRET` | C, N, O | Slack kanalı `requires_credentials` |
| `TEAMS_WEBHOOK_URL` | C, N, O | Teams kanalı `requires_credentials` |
| `CRM_API_KEY` | C, O | CRM kanalı `requires_credentials` |

The AI core runs on the mock GPT/Claude providers only; every answer carries `mock: true`. Real model keys are a separate, later step.

## Testing Integrations

### Run All Integration Tests
```bash
npm test -- integration/
```

### Run Specific Integration Tests
```bash
# Payment tests
npm test -- integration/payment.test.ts

# Email tests
npm test -- integration/email.test.ts

# Notification tests
npm test -- integration/notification.test.ts

# Analytics tests
npm test -- integration/analytics.test.ts

# Realtime tests
npm test -- integration/realtime.test.ts
```

### Verify Production Configuration

Before deploying, verify all integrations are working:

```bash
# Set correct environment variables
export PAYMENT_PROVIDER=stripe
export EMAIL_PROVIDER=sendgrid
export NOTIFICATION_PROVIDER=slack
export ANALYTICS_PROVIDER=mixpanel

# Run tests
npm test

# Run build
npm run build

# Check for errors
npm run typecheck
npm run lint
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Choose payment provider (Stripe or Square)
- [ ] Configure payment provider credentials
- [ ] Choose email provider (SendGrid or Mailgun)
- [ ] Configure email provider credentials
- [ ] Create Slack app (optional)
- [ ] Configure Slack credentials (optional)
- [ ] Choose analytics provider (Mixpanel or Segment)
- [ ] Configure analytics credentials (optional)
- [ ] Test all integrations locally
- [ ] All tests passing

### Vercel Deployment
- [ ] Add environment variables to Vercel project
- [ ] Redeploy production branch
- [ ] Verify API endpoints working
- [ ] Verify integrations responding
- [ ] Check error logs
- [ ] Monitor analytics events

### Post-Deployment
- [ ] Set up webhooks (Stripe, Slack, etc.)
- [ ] Configure domain-specific settings
- [ ] Set up monitoring and alerts
- [ ] Document any custom configurations
- [ ] Create runbook for team

---

## Support & Troubleshooting

### Payment Integration Issues
- **Error:** `STRIPE_API_KEY not found`
  - **Solution:** Add `STRIPE_API_KEY` to `.env.local` or Vercel environment variables

- **Error:** `Invalid Stripe API key`
  - **Solution:** Verify key starts with `sk_test_` (dev) or `sk_live_` (prod)

### Email Integration Issues
- **Error:** `Email not sent`
  - **Solution:** Check API key, verify sender email is authorized

- **Error:** `SENDGRID_API_KEY not found`
  - **Solution:** Create API key in SendGrid dashboard

### Slack Integration Issues
- **Error:** `SLACK_BOT_TOKEN not found`
  - **Solution:** Copy bot token from Slack app settings

- **Error:** `Message not posting to Slack`
  - **Solution:** Verify bot has `chat:write` permission and channel exists

### Analytics Integration Issues
- **Error:** `MIXPANEL_TOKEN not found`
  - **Solution:** Copy project token from Mixpanel settings

- **Error:** `Events not appearing in Mixpanel`
  - **Solution:** Check project token is correct, events are being sent

---

## Next Steps

1. **Choose Your Providers**
   - Pick one payment provider (Stripe recommended)
   - Pick one email provider (SendGrid recommended)
   - Optional: Slack for notifications
   - Optional: Mixpanel for analytics

2. **Create Accounts**
   - Sign up for each chosen provider
   - Get API credentials

3. **Configure Environment Variables**
   - Add to `.env.local` for testing
   - Add to Vercel for production

4. **Test Integrations**
   - Run unit tests
   - Manual testing in development
   - Verify in production

5. **Monitor & Iterate**
   - Watch logs for integration errors
   - Fine-tune configurations
   - Optimize batch sizes and flush intervals

---

**Last Updated:** 2026-09-26  
**Status:** Ready for Production Configuration
