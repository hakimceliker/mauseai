import { EventEmitter } from 'node:events';
import * as http from 'http';
import * as https from 'https';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { approvedProbeUrl, validateOllama, validateSupabase } from '../../scripts/validate-credentials';

vi.mock('http', () => ({ get: vi.fn() }));
vi.mock('https', () => ({ get: vi.fn() }));

const projectOrigin = `https://${'a'.repeat(20)}.supabase.co`;
const localOrigin = 'http://127.0.0.1:11434';
const fakeKey = 'unit-test-only';

function respond(statusCode: number) {
  const request = Object.assign(new EventEmitter(), { destroy: vi.fn() });
  const response = { statusCode, resume: vi.fn() };
  const implementation = (_url: unknown, _options?: unknown, callback?: unknown) => {
    queueMicrotask(() => (callback as (res: typeof response) => void)(response));
    return request as unknown as http.ClientRequest;
  };
  vi.mocked(http.get).mockImplementation(implementation);
  vi.mocked(https.get).mockImplementation(implementation);
  return { request, response };
}

beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe('credential probe network boundary', () => {
  it('does not derive outbound destinations from credential configuration', async () => {
    const data = { supabaseUrl: 'https://untrusted.example/?secret=value', supabaseAnonKey: fakeKey, ollamaUrl: 'http://untrusted.example' };
    expect((await validateSupabase(data)).reachable).toBeUndefined();
    expect((await validateOllama(data)).reachable).toBeUndefined();
    expect(http.get).not.toHaveBeenCalled();
    expect(https.get).not.toHaveBeenCalled();
  });

  it.each([
    'http://aaaaaaaaaaaaaaaaaaaa.supabase.co',
    'https://aaaaaaaaaaaaaaaaaaaa.supabase.co.untrusted.example',
    'https://aaaaaaaaaaaaaaaaaaaa.supabase.co@untrusted.example',
    `${projectOrigin}/?token=private`,
    `${projectOrigin}/#private`,
    `${projectOrigin}/private-path`,
    `${projectOrigin}:444`,
    `https://user:password@${'a'.repeat(20)}.supabase.co`,
  ])('rejects an unsafe Supabase destination: %s', async (url) => {
    const result = await validateSupabase({ supabaseUrl: url, supabaseAnonKey: fakeKey }, url);
    expect(result.reachable).toBe(false);
    expect(https.get).not.toHaveBeenCalled();
    expect(http.get).not.toHaveBeenCalled();
  });

  it.each([
    'http://127.0.0.1.untrusted.example:11434',
    'http://169.254.169.254:11434',
    'http://localhost:22',
    'http://localhost:11434/?token=private',
    'http://user:password@localhost:11434',
  ])('rejects an unsafe Ollama destination: %s', (url) => {
    expect(() => approvedProbeUrl('ollama', url)).toThrow();
  });

  it('requires the explicit destination to match the configured provider', async () => {
    const result = await validateSupabase({ supabaseUrl: `https://${'b'.repeat(20)}.supabase.co`, supabaseAnonKey: fakeKey }, projectOrigin);
    expect(result.reachable).toBe(false);
    expect(https.get).not.toHaveBeenCalled();
  });

  it.each([200, 401, 403, 404])('probes an approved project without sending credentials (HTTP %s)', async (status) => {
    const { response } = respond(status);
    const result = await validateSupabase({ supabaseUrl: projectOrigin, supabaseAnonKey: fakeKey }, projectOrigin);
    expect(result.reachable).toBe(true);
    expect(https.get).toHaveBeenCalledWith(projectOrigin, { timeout: 5000 }, expect.any(Function));
    expect(JSON.stringify(vi.mocked(https.get).mock.calls)).not.toContain(fakeKey);
    expect(response.resume).toHaveBeenCalled();
  });

  it('does not follow a redirect or call it a successful health check', async () => {
    respond(302);
    const result = await validateOllama({ ollamaUrl: localOrigin }, localOrigin);
    expect(result.reachable).toBe(false);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(`${localOrigin}/api/tags`, { timeout: 5000 }, expect.any(Function));
    expect(https.get).not.toHaveBeenCalled();
  });

  it('destroys a request that never responds and reports failure', async () => {
    vi.useFakeTimers();
    const request = Object.assign(new EventEmitter(), { destroy: vi.fn() });
    vi.mocked(http.get).mockReturnValue(request as unknown as http.ClientRequest);
    const result = validateOllama({ ollamaUrl: localOrigin }, localOrigin);
    await vi.advanceTimersByTimeAsync(5000);
    expect(request.destroy).toHaveBeenCalled();
    expect((await result).reachable).toBe(false);
  });
});
