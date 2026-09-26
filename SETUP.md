# MauseAI v0.1.0 - Local Setup

## Prerequisites
- Node.js 18+
- npm or yarn

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/hakimceliker/mauseai.git
cd mauseai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the required values:
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for development)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `INNGEST_EVENT_KEY` - Your Inngest event key
- `INNGEST_SIGNING_KEY` - Your Inngest signing key
- `AI_PROVIDER` - Set to `mock` for development (or `openai`/`anthropic` with API keys)
- `ALLOWED_ORIGINS` - Comma-separated CORS origins, e.g. `https://app.example.com,http://localhost:3000` (default `http://localhost:3000`; `*` allows all)
- `LOG_LEVEL` - `debug`, `info`, `warn` or `error` (default `info`)
- `LOG_FORMAT` - `json` for log aggregation or `text` for local reading (default `json`)

`ALLOWED_ORIGINS`, `LOG_LEVEL` and `LOG_FORMAT` are validated with Zod in
`src/lib/config/validation.ts`. An invalid value falls back to the safe default
at runtime and makes `GET /api/health/ready` return 503 until it is fixed.

### 4. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Development Commands

### Testing
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run E2E tests (requires Supabase)
npm run test:e2e
```

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Building
```bash
# Build for production
npm run build

# Build and start server
npm run build
npm run start
```

## Project Structure

```
mauseai/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   └── inngest/          # Inngest workflow definitions
├── public/               # Static assets
├── supabase/             # Supabase migrations and SQL
├── tests/                # Test files
└── docs/                 # Documentation
```

## Features

- **Multi-tenant AI Task Execution** - Support for multiple users/organizations
- **Cost Tracking & Credit Limits** - Monitor and limit AI API usage
- **Checkpoint-based Resumption** - Resume long-running tasks from checkpoints
- **Inngest Orchestration** - Reliable event-driven workflows
- **Mock AI Providers** - Test without real API keys
- **Supabase with RLS** - Secure database with row-level security
- **Comprehensive Audit Logging** - Track all user actions

## Authentication

The app uses Supabase authentication. Users can:
- Sign up with email/password
- Sign in with existing account
- Access RLS-protected data

## Database

The project uses Supabase PostgreSQL with:
- Users and organizations
- Tasks with checkpoints
- Audit logs
- Credit tracking

Run migrations:
```bash
supabase migration up
```

## Troubleshooting

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001
```

### Supabase Connection Issues
- Verify `SUPABASE_URL` and keys in `.env.local`
- Check Supabase project is active
- Ensure database migrations are applied

### Build Errors
```bash
# Clean and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### TypeScript Errors
```bash
npm run typecheck
```

## For More Information

- See [README.md](./README.md) for project overview
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for production deployment
