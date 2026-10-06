#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// This gate verifies the production build's fail-closed contract without secrets
// or external API calls. It is not proof of configured production readiness.
const env = { ...process.env, NODE_ENV: 'production', PAYMENT_PROVIDER_TYPE: 'mock',
  NOTIFICATION_TYPE: 'console', ANALYTICS_TYPE: 'console' };
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY']) delete env[name];
const baseUrl = 'http://127.0.0.1:3100';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start',
  '--hostname', '127.0.0.1', '--port', '3100'], { env, stdio: 'ignore' });
let spawnError;
server.on('error', (error) => { spawnError = error; });
async function request(path, method = 'GET') {
  return fetch(`${baseUrl}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(3000) });
}
try {
  let health;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (spawnError) throw spawnError;
    assert.equal(server.exitCode, null, 'server exited before health probe');
    try { health = await request('/api/health'); break; } catch {
      await delay(500);
    }
  }
  assert.ok(health, 'server did not become available within bounded retries');
  assert.equal(health.status, 503);
  const body = await health.json();
  assert.equal(body.status, 'degraded');
  assert.equal(body.database?.status, 'not_configured');
  assert.equal(body.database?.code, 'credential_not_configured');
  assert.deepEqual(body.database?.missing, ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  assert.equal(body.integrations?.payment?.provider, 'mock');
  const ready = await request('/api/health/ready');
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), { ready: false });
  const head = await request('/api/health/ready', 'HEAD');
  assert.equal(head.status, 503);
  assert.equal(await head.text(), '');
  console.log('PASS: built app health/readiness reject missing credentials (HTTP 503)');
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => { if (server.exitCode !== null || spawnError) resolve(); else server.once('exit', resolve); }),
    delay(3000),
  ]);
  if (server.exitCode === null && !spawnError) server.kill('SIGKILL');
}
