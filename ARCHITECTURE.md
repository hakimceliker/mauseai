# Mause AI Architecture

## Overview

Mause AI is a multi-tenant, workflow-driven AI agent orchestration platform built with Next.js, Supabase, and Inngest.

## Core Principles

### 1. Multi-Tenancy
- **Tenant Isolation**: Every entity (task, workflow, user, message) belongs to a tenant
- **No Data Leakage**: Queries and RLS policies enforce tenant boundaries
- **Shared Infrastructure**: Single database, separate logical partitions per tenant

### 2. Row-Level Security (RLS)
- **Deny-by-Default**: All tables have RLS enabled
- **Tenant Scoped**: Policies restrict data access to current tenant via `auth.get_tenant_id()`
- **User Context**: JWT claims carry `tenant_id` and `user_id`

### 3. Authentication
- **Phase 3-11**: Mock auth via headers (`x-tenant-id`, `x-user-id`)
- **Phase 12+**: Supabase Auth with JWT tokens carrying tenant claims
- **Passwordless**: Magic link authentication (Supabase Auth)

## Database Schema

### Core Tables
- **tenants**: Tenant metadata, monthly credit limits
- **users**: User profiles with tenant association
- **workflows**: Workflow definitions per tenant
- **steps**: Individual workflow steps with retry/timeout config
- **tasks**: Task execution records with status tracking
- **checkpoints**: Resumption points for fault tolerance

### Supporting Tables
- **idempotency_keys**: Duplicate detection for step execution
- **audit_logs**: Complete audit trail of all actions
- **conversations**: Multi-turn conversation state machines
- **messages**: Conversation messages with role tracking
- **offers**: Discount offers with policy validation

### RLS Policies
All tables implement tenant isolation:
```sql
-- Example: Tasks table
CREATE POLICY tasks_tenant_read ON tasks FOR SELECT
  USING (tenant_id = auth.get_tenant_id());
```

## API Architecture

### Request Flow
1. **Authentication Middleware**: Extract tenant/user from headers or JWT
2. **Authorization**: Verify user belongs to requested tenant
3. **Business Logic**: Execute operation
4. **Tenant Scoping**: All DB queries implicitly filtered by tenant

### Endpoints by Phase

**Phase 3**: Task Management
- POST /api/tasks
- GET /api/tasks/:id
- DELETE /api/tasks/:id

**Phase 10**: Conversations
- POST /api/conversations
- GET /api/conversations/:id
- PUT /api/conversations/:id (state transition)
- POST /api/conversations/:id/messages

**Phase 11**: Offers
- POST /api/offers
- GET /api/offers/:id
- PUT /api/offers/:id (status update)

## Cost Tracking & Limits

### Cost Flow
1. **Task Creation**: Estimate cost
2. **Step Execution**: Call AI provider, capture actual cost
3. **Checkpoint**: Save step result and cost
4. **Task Completion**: Aggregate step costs → task.cost_actual

### Tenant Limits
- **monthly_limit**: Credit limit per tenant (stored in `tenants` table)
- **Enforcement**: Before step execution, check `remaining = limit - current_cost`
- **Audit**: Log cost_limit_exceeded event when limit is breached

## Workflow Execution

### Inngest Worker
- **Task Event**: `task.execute` triggered on task creation
- **Step-by-Step**: Each step executed as separate Inngest step
- **Checkpoints**: After each step, save resumption state
- **Idempotency**: Skip duplicate execution on retry
- **Error Handling**: Failed step → task failure, audit log

### State Machine
```
pending → running → completed
       ↘         ↙
          failed
```

## Policy Engine

### Offer Validation Rules
1. **Discount Limit**: `discount_percent <= 20%`
2. **Price Cap**: `price_cap >= base_price`

Validated on offer creation before persisting.

## Conversation State Machine

States: `idle` → `pending` → `review` → `approved` → `completed`

Transitions triggered via PUT /api/conversations/:id with new state.

## Security Considerations

### Tenant Isolation
- Database-level RLS enforcement
- Every query scoped to current tenant
- No cross-tenant data access possible

### Authentication
- Mock auth for testing (Phase 3-11)
- Real Supabase Auth for production (Phase 12+)
- JWT claims carry tenant context

### Cost Protection
- Tenant credit limits enforced before execution
- All costs logged for audit trail
- Transparent cost reporting per task

## Deployment

### Environment Configuration
```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
INNGEST_EVENT_KEY=...
AI_PROVIDER=mock|gpt|claude
```

### Database Migrations
Supabase migrations in `supabase/migrations/`:
- `0001_core.sql`: Core schema with RLS
- `0002_idempotency.sql`: Idempotency keys
- Future: Auth, additional features

## Testing

### Tenant Isolation Tests
- Verify Tenant A cannot see Tenant B's tasks
- Verify RLS policies block cross-tenant access
- Test cost limit enforcement

### API Tests
- Happy path: task creation → execution → completion
- Error path: limit exceeded, step timeout, retry

### Audit Trail
- Verify all events logged (task_created, cost_incurred, etc.)
- Check audit logs per tenant
