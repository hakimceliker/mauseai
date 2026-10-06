# Mause AI v0.1.0

Multi-tenant AI workflow orchestration platform with intelligent agent execution, cost tracking, and audit logging.

## Quick Links
- [Setup](#setup)
- [API Reference](#api-reference)
- [Architecture](./ARCHITECTURE.md)
- [Deployment](./RUNBOOK.md)

## Overview

Mause AI is a modern platform for orchestrating AI agent workflows at scale. Built with:
- **Next.js** for API and frontend
- **Supabase** for multi-tenant data with Row-Level Security
- **Inngest** for reliable async task execution
- **Zod** for type-safe validation
- **Vitest** for comprehensive testing

## Key Features

### 🏢 Multi-Tenancy
- Complete tenant isolation at the database level
- Row-Level Security (RLS) policies on all tables
- Per-tenant credit limits and usage tracking

### 🤖 AI Routing
- Support for multiple AI providers (GPT, Claude, or mock)
- Provider selection via environment variable
- Cost tracking per provider per task

### 📋 Workflow Execution
- Inngest-powered reliable async execution
- Step-by-step workflow processing
- Checkpoint-based resumption on failure

### 🔄 Fault Tolerance
- Idempotent step execution with duplicate detection
- Automatic retries (up to 3 times)
- Timeout enforcement (30 seconds per step)

### 💰 Cost Management
- Per-step cost tracking
- Tenant credit limits with enforcement
- Detailed cost audit logs

### 💬 Conversation Management
- State machine-based conversation flows
- Transition support: idle → pending → review → approved → completed
- Message threading with role support (user/assistant/system)

### 🎁 Offer Management
- Policy-driven offer validation
- Business rules: max 20% discount, price_cap ≥ base_price
- Status tracking: draft → active → archived

### 📊 Audit Trail
- Complete event logging (task, step, cost, state transitions)
- Per-tenant audit log queries
- Immutable event records

## Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account (or self-hosted)
- Inngest workspace (for async execution)

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/hakimceliker/mauseai
cd mauseai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_SUPABASE_URL=your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
# SUPABASE_SERVICE_ROLE_KEY=your-key
# INNGEST_EVENT_KEY=your-key

# 4. Run development server
npm run dev

# Open http://localhost:3000
```

### Supabase Setup

1. Create a new project on [supabase.com](https://supabase.com)
2. Run migrations in SQL editor:
   - `supabase/migrations/0001_core.sql`
   - `supabase/migrations/0002_idempotency.sql`
3. Copy project URL and keys to `.env.local`

## API Reference

### Authentication
For Phase 3-11 (testing), use mock auth headers:
```bash
-H "x-tenant-id: tenant-uuid"
-H "x-user-id: user-uuid"
```

For Phase 12+ (production), use Supabase Auth JWT in Authorization header.

### Task Management

#### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1" \
  -d '{
    "workflow_id": "workflow-1",
    "input": { "prompt": "Your prompt here" }
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "pending",
    "cost_estimate": 0,
    "created_at": "2026-09-26T14:30:00Z"
  }
}
```

#### Get Task
```bash
curl http://localhost:3000/api/tasks/task-uuid \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

#### Cancel Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/task-uuid \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

### Conversations

#### Create Conversation
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

#### Add Message
```bash
curl -X POST http://localhost:3000/api/conversations/conv-uuid/messages \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1" \
  -d '{
    "role": "user",
    "content": "Your message"
  }'
```

#### Transition State
```bash
curl -X PUT http://localhost:3000/api/conversations/conv-uuid \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1" \
  -d '{
    "state": "pending"
  }'
```

### Offers

#### Create Offer
```bash
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1" \
  -d '{
    "template_id": "template-1",
    "discount_percent": 15,
    "price_cap": 100,
    "base_price": 90
  }'
```

#### Get Offers
```bash
curl "http://localhost:3000/api/offers?status=active" \
  -H "x-tenant-id: tenant-1" \
  -H "x-user-id: user-1"
```

## Development

### Available Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run test       # Run tests (Vitest)
npm run test:ui    # Run tests with UI
npm run typecheck  # Check TypeScript
npm run lint       # Run ESLint
```

### Testing
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- e2e.test.ts

# Watch mode
npm run test -- --watch
```

Tests cover:
- Tenant isolation
- Task lifecycle
- Idempotency and retries
- Cost tracking and limits
- Conversation state machines
- Policy engine validation
- Complete E2E workflows

## Configuration

### Environment Variables
See `.env.example` for all options:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Inngest
INNGEST_EVENT_KEY=

# AI Provider (mock, gpt, or claude)
AI_PROVIDER=mock

# Auth (mock for testing, supabase for production)
AUTH_PROVIDER=mock
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── tasks/              # Task CRUD endpoints
│   │   ├── conversations/      # Conversation management
│   │   ├── offers/             # Offer management
│   │   └── inngest/            # Inngest worker endpoint
│   └── page.tsx                # Demo UI
├── lib/
│   ├── ai/                     # AI provider routing
│   ├── audit/                  # Audit logging service
│   ├── auth/                   # Authentication
│   ├── cost/                   # Cost tracking
│   ├── db/                     # Database repositories
│   └── policy/                 # Policy engine
├── inngest/
│   ├── client.ts               # Inngest client setup
│   └── functions/              # Worker functions
└── types/
    └── domain.ts               # Core domain types
```

## Deployment

See [RUNBOOK.md](./RUNBOOK.md) for detailed deployment instructions.

Quick summary:
1. Deploy to Vercel or self-hosted
2. Set environment variables
3. Run Supabase migrations
4. Configure Inngest webhooks
5. Monitor via audit logs

## Performance & Limits

- **Step Timeout**: 30 seconds
- **Task Timeout**: 1 hour
- **Max Retries**: 3
- **Cost Tracking Accuracy**: Per-step
- **Audit Log Retention**: Indefinite

## Security

- **Row-Level Security**: All tables protected
- **Tenant Isolation**: Database-enforced
- **Cost Limits**: Per-tenant enforcement
- **Input Validation**: Zod schemas on all APIs
- **Audit Trail**: Complete event logging

## License

MIT

## Support

- GitHub Issues: Report bugs and request features
- Documentation: See ARCHITECTURE.md and RUNBOOK.md
- Email: hakimceliker.ac@gmail.com

# Project control

Current status, ownership, acceptance vocabulary, and remaining production gates are maintained in [PROJECT_STATUS.md](PROJECT_STATUS.md). The repository/PR/CI/integration source-of-truth matrix is in [docs/repository-control-matrix.md](docs/repository-control-matrix.md).

Senatech Ajan Merkezi çalışma standardı ve proje uyum manifesti: [senatech.project.yaml](senatech.project.yaml) ve [Senatech Ajan Merkezi Standardı v1.0](docs/governance/senatech-agent-center-standard-v1.0.md).
