import { test, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { callControlPlane } from '../src/lib/ai/providers/control-plane.ts';

const originalFetch = globalThis.fetch;
const keys = ['SENATECH_CONTROL_PLANE_TENANT_ID', 'SENATECH_CONTROL_PLANE_TOKEN', 'SENATECH_CONTROL_PLANE_URL'];
const old = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => { globalThis.fetch = originalFetch; for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; } });
function configure() {
  process.env.SENATECH_CONTROL_PLANE_TENANT_ID = 'tenant-a';
  process.env.SENATECH_CONTROL_PLANE_TOKEN = 'test-only';
  process.env.SENATECH_CONTROL_PLANE_URL = 'https://control.example';
}
const context = {tenantId: 'tenant-a', requestId: 'mouseai:task:step'};
const messages = [{role: 'user', content: 'safe test'}];
function result() { return {request_id: context.requestId, decision: {status:'selected',approval_required:false}, result:{validated:true,output:'done'}}; }

test('authenticated execution binds tenant/project and preserves unknown usage', async () => {
  configure();
  let calls = 0;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://control.example/v1/execute');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers['x-control-token'], 'test-only');
    const body = JSON.parse(init.body);
    assert.equal(body.metadata.tenant_id, 'tenant-a');
    assert.equal(body.client, 'mouseai');
    assert.deepEqual(body.required_capabilities, ['text']);
    return Response.json(result());
  };
  const response = await callControlPlane(messages, context);
  assert.equal(response.content, 'done');
  assert.equal(response.tokens_used, undefined);
  assert.equal(response.cost, undefined);
  assert.equal(calls, 1);
});
for (const supplied of [undefined, {...context,tenantId:'tenant-b'}, {...context, requestId:'bad\nheader'}]) {
  test('rejects absent or mismatched trusted context before network', async () => {
    configure(); globalThis.fetch = async () => { throw new Error('NETWORK_MUST_NOT_RUN'); };
    await assert.rejects(callControlPlane(messages, supplied), /binding_rejected/);
  });
}
for (const url of ['http://control.example','https://user:pass@control.example','https://control.example/path','https://control.example/?token=value']) {
  test('rejects unsafe configured endpoint '+url, async () => {
    configure(); process.env.SENATECH_CONTROL_PLANE_URL=url;
    await assert.rejects(callControlPlane(messages, context), /url_invalid/);
  });
}
for (const mutate of [
  data => data.request_id='wrong',
  data => data.decision.approval_required=true,
  data => data.result.validated=false,
  data => data.result.output='',
]) {
  test('rejects unconfirmed execution response without retry', async () => {
    configure(); let calls=0;
    const data=result(); mutate(data);
    globalThis.fetch=async()=>{calls++;return Response.json(data);};
    await assert.rejects(callControlPlane(messages, context), /execution_unconfirmed/);
    assert.equal(calls,1);
  });
}
test('network ambiguity is redacted and never retried', async () => {
  configure(); let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('secret and prompt');};
  await assert.rejects(callControlPlane(messages, context), error => error.message === 'control_plane_execution_unconfirmed');
  assert.equal(calls,1);
});
