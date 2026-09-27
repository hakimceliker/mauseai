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

if (!bearer) {
  console.log('auth_tasks: skipped (SMOKE_BEARER_TOKEN not configured)');
  process.exit(process.exitCode || 0);
}

const tasks = await request('/api/tasks');
console.log(`tasks_read: ${tasks.response.status}`);
if (!tasks.response.ok) process.exitCode = 1;

if (!createTask) {
  console.log('task_write: skipped (set SMOKE_CREATE_TASK=1 for an explicit test task)');
  process.exit(process.exitCode || 0);
}

if (!workflowId) {
  console.error('configuration_missing:SMOKE_WORKFLOW_ID');
  process.exit(2);
}

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
