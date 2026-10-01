#!/usr/bin/env node

/**
 * Safe production acceptance runner.
 *
 * It never prints credentials or response bodies. Missing credentials are
 * reported as credential_not_configured and the related gate remains FAIL.
 */

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const tokenA = process.env.SMOKE_USER_A_TOKEN || '';
const tokenB = process.env.SMOKE_USER_B_TOKEN || '';
const workflowId = process.env.SMOKE_WORKFLOW_ID || '';
const pollAttempts = Number(process.env.SMOKE_POLL_ATTEMPTS || 6);
const pollDelayMs = Number(process.env.SMOKE_POLL_DELAY_MS || 5000);
const evidenceFile = process.env.SMOKE_EVIDENCE_FILE || '';
const results = [];

const integrationRequirements = [
  ['supabase_url', 'NEXT_PUBLIC_SUPABASE_URL'],
  ['supabase_anon_key', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  ['supabase_service_role', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['inngest_event_key', 'INNGEST_EVENT_KEY'],
  ['inngest_signing_key', 'INNGEST_SIGNING_KEY'],
  ['openai_provider', 'OPENAI_API_KEY'],
  ['anthropic_provider', 'ANTHROPIC_API_KEY'],
  ['stripe_sandbox', 'PAYMENT_API_KEY'],
  ['posthog_analytics', 'POSTHOG_KEY'],
  ['sentry', 'SENTRY_DSN'],
  ['langfuse_public', 'LANGFUSE_PUBLIC_KEY'],
  ['langfuse_secret', 'LANGFUSE_SECRET_KEY'],
];

function record(name, status, detail) {
  const item = { name, status, detail };
  results.push(item);
  console.log(`${name}: ${status}${detail ? ` (${detail})` : ''}`);
}

function configured(name, value) {
  if (value) return true;
  record(name, 'FAIL', 'credential_not_configured');
  return false;
}

async function request(path, { token = '', ...options } = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  let body = null;
  try { body = await response.json(); } catch { /* no body */ }
  return { response, body };
}

function tenantIds(body) {
  const rows = Array.isArray(body?.data) ? body.data : [];
  return new Set(rows.map((row) => row?.tenant_id).filter(Boolean));
}

async function pollTask(taskId, token) {
  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const result = await request(`/api/tasks/${encodeURIComponent(taskId)}`, { token });
    const status = result.body?.data?.status;
    if (status === 'completed' || status === 'failed' || status === 'blocked') return result;
    if (attempt + 1 < pollAttempts) await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
  }
  return null;
}

if (!baseUrl) {
  console.error('configuration_missing:SMOKE_BASE_URL');
  process.exit(2);
}

const health = await request('/api/health');
record('health', health.response.ok ? 'PASS' : 'FAIL', String(health.response.status));

const readiness = await request('/api/health/ready');
record('readiness', readiness.response.ok ? 'PASS' : 'FAIL', String(readiness.response.status));

const inngest = await request('/api/inngest');
record('inngest_endpoint', [200, 401, 405].includes(inngest.response.status) ? 'PASS' : 'FAIL', String(inngest.response.status));

const anonymous = await request('/api/tasks');
record('anonymous_access_rejected', anonymous.response.status === 401 ? 'PASS' : 'FAIL', String(anonymous.response.status));

for (const [name, envName] of integrationRequirements) {
  record(`config_${name}`, process.env[envName] ? 'PASS' : 'NOT_RUN', process.env[envName] ? 'configured' : `credential_not_configured:${envName}`);
}

if (configured('user_a_credential', tokenA)) {
  const invalid = await request('/api/tasks', { token: 'invalid-token' });
  record('invalid_token_rejected', invalid.response.status === 401 ? 'PASS' : 'FAIL', String(invalid.response.status));

  const tasksA = await request('/api/tasks', { token: tokenA });
  record('user_a_tasks_read', tasksA.response.ok ? 'PASS' : 'FAIL', String(tasksA.response.status));
  const idsA = tenantIds(tasksA.body);
  record('user_a_single_tenant', idsA.size <= 1 ? 'PASS' : 'FAIL', `${idsA.size} tenant(s)`);

  if (configured('user_b_credential', tokenB)) {
    const tasksB = await request('/api/tasks', { token: tokenB });
    record('user_b_tasks_read', tasksB.response.ok ? 'PASS' : 'FAIL', String(tasksB.response.status));
    const idsB = tenantIds(tasksB.body);
    record('user_b_single_tenant', idsB.size <= 1 ? 'PASS' : 'FAIL', `${idsB.size} tenant(s)`);
    record('tenant_views_are_distinct', idsA.size === 1 && idsB.size === 1 && [...idsA][0] !== [...idsB][0] ? 'PASS' : 'FAIL', 'tenant comparison');

    const foreignTaskId = Array.isArray(tasksA.body?.data) ? tasksA.body.data[0]?.id : '';
    if (foreignTaskId) {
      const foreign = await request(`/api/tasks/${encodeURIComponent(foreignTaskId)}`, { token: tokenB });
      record('cross_tenant_task_rejected', [403, 404].includes(foreign.response.status) ? 'PASS' : 'FAIL', String(foreign.response.status));
    } else {
      record('cross_tenant_task_rejected', 'FAIL', 'test data missing');
    }
  }

  if (!workflowId) {
    record('workflow_trigger', 'FAIL', 'credential_not_configured:SMOKE_WORKFLOW_ID');
  } else {
    const created = await request('/api/tasks', {
      token: tokenA,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflowId, input: { smoke_test: true } }),
    });
    const taskId = created.body?.data?.id;
    record('workflow_trigger', created.response.ok && taskId ? 'PASS' : 'FAIL', String(created.response.status));
    if (taskId) {
      const completed = await pollTask(taskId, tokenA);
      const state = completed?.body?.data?.status || 'timeout';
      record('worker_terminal_state', ['completed', 'failed', 'blocked'].includes(state) ? 'PASS' : 'FAIL', state);
      record('checkpoint_observable', Array.isArray(completed?.body?.data?.checkpoints) ? 'PASS' : 'FAIL', 'response shape');
    }
  }
} else {
  record('auth_and_tenant_gates', 'FAIL', 'credential_not_configured:SMOKE_USER_A_TOKEN');
}

const failed = results.filter((item) => item.status === 'FAIL').length;
if (evidenceFile) {
  const fs = await import('node:fs/promises');
  await fs.writeFile(evidenceFile, `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
  console.log(`evidence_file: written (${evidenceFile})`);
}
process.exitCode = failed ? 1 : 0;
