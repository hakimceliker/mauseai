#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.BASE_URL || '').replace(/\/$/, '');
const bearer = process.env.SMOKE_BEARER_TOKEN || '';
const workflowId = process.env.SMOKE_WORKFLOW_ID || '';
const createTask = process.env.SMOKE_CREATE_TASK === '1';

if (!baseUrl) {
  console.error('configuration_missing:SMOKE_BASE_URL');
  process.exit(2);
}

const headers = bearer ? { authorization: `Bearer ${bearer}` } : {};

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { response, body };
}

const health = await request('/api/health');
console.log(`health: ${health.response.status}`);
if (!health.response.ok) process.exitCode = 1;

const readiness = await request('/api/health/ready');
console.log(`readiness: ${readiness.response.status}`);
if (!readiness.response.ok) process.exitCode = 1;

// GET is intentionally used only as an availability check. It does not send
// an event and therefore cannot mutate production data.
const inngest = await request('/api/inngest');
console.log(`inngest_endpoint: ${inngest.response.status}`);
if (![200, 401, 405].includes(inngest.response.status)) process.exitCode = 1;

if (!bearer) {
  console.log('auth_tasks: credential_not_configured (SMOKE_BEARER_TOKEN not configured)');
} else {
  const tasks = await request('/api/tasks');
  console.log(`tasks_read: ${tasks.response.status}`);
  if (!tasks.response.ok) process.exitCode = 1;

  if (!createTask) {
    console.log('task_write: skipped (set SMOKE_CREATE_TASK=1 for an explicit test task)');
  } else if (!workflowId) {
    console.error('configuration_missing:SMOKE_WORKFLOW_ID');
    process.exitCode = 2;
  } else {
    const created = await request('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workflow_id: workflowId,
        input: { smoke_test: true, requested_at: new Date().toISOString() },
      }),
    });
    console.log(`task_create: ${created.response.status}`);
    if (!created.response.ok) process.exitCode = 1;
    if (created.response.ok) {
      const taskId = created.body?.data?.id;
      console.log(`task_id: ${taskId ? 'created' : 'missing'}`);
      if (!taskId) process.exitCode = 1;
    }
  }
}
