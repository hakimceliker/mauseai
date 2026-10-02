import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/operations');
  /*
   * The technical API reference remains in the repository documentation.
   * The product entry point intentionally opens the canonical MouseAI workspace.
   */
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '20px', marginBottom: '20px' }}>
        <h1>Mause AI v0.1.0</h1>
        <p style={{ color: '#666' }}>Multi-agent workflow engine with Supabase, Inngest, and AI routing</p>
        <p style={{ marginTop: '10px' }}>
          <a href="/operations" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>
            → Dashboard'a Git
          </a>
          {' · '}
          <a href="/login" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>
            Giriş yap
          </a>
        </p>
      </header>

      <section style={{ marginBottom: '40px' }}>
        <h2>Features</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Multi-tenant task execution with Inngest</li>
          <li>AI provider routing (Local AI with guarded OpenAI/Claude fallback)</li>
          <li>Step-by-step workflow execution with checkpoints</li>
          <li>Idempotent step execution with duplicate detection</li>
          <li>Cost tracking and tenant credit limits</li>
          <li>Row-level security (RLS) for tenant isolation</li>
          <li>Conversation state machines</li>
          <li>Offer management with policy engine</li>
          <li>Comprehensive audit logging</li>
        </ul>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Quick Start</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`# Clone and install
git clone https://github.com/hakimceliker/mauseai
cd mauseai
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run dev server
npm run dev

# Open http://localhost:3000
# Production/API requests require a Supabase bearer token.
# Mock x-tenant-id/x-user-id headers are local-only and must never be used in production.
`}
        </pre>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>API Examples</h2>

        <h3>Create a Task</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`curl -X POST ${appUrl}/api/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \\
  -d '{
    "workflow_id": "workflow-1",
    "input": { "prompt": "Hello AI" }
  }'`}
        </pre>

        <h3>Get Task Status</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`curl ${appUrl}/api/tasks/task-uuid \\
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"`}
        </pre>

        <h3>Create Conversation</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`curl -X POST ${appUrl}/api/conversations \\
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"`}
        </pre>

        <h3>Create Offer</h3>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`curl -X POST ${appUrl}/api/offers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \\
  -d '{
    "template_id": "template-1",
    "discount_percent": 15,
    "price_cap": 100,
    "base_price": 90
  }'`}
        </pre>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>Documentation</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li><a href="https://github.com/hakimceliker/mauseai#readme">README.md</a> - Full setup and API guide</li>
          <li><a href="https://github.com/hakimceliker/mauseai/blob/main/RUNBOOK.md">RUNBOOK.md</a> - Deployment and monitoring</li>
          <li><a href="https://github.com/hakimceliker/mauseai/blob/main/ARCHITECTURE.md">ARCHITECTURE.md</a> - System design</li>
        </ul>
      </section>

      <section>
        <h2>Running Tests</h2>
        <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
{`npm run test       # Run all tests
npm run typecheck  # TypeScript check
npm run lint       # ESLint check
npm run build      # Build for production`}
        </pre>
      </section>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', color: '#666', fontSize: '0.9em' }}>
        <p>For more information, see RUNBOOK.md and ARCHITECTURE.md</p>
        <p>Phase 3-14 implementation: Task API, Database, Inngest, Cost Tracking, RLS, E2E Tests</p>
      </footer>
    </div>
  );
}
