import { describe, expect, it } from 'vitest';
import { isAllowedHost } from '../../scripts/phase-c-e-executor';

describe('Phase C-E endpoint allowlist', () => {
  it.each(['localhost', '127.0.0.1', '::1', 'project.supabase.co'])('allows supported host %s', (hostname) => {
    expect(isAllowedHost(hostname)).toBe(true);
  });

  it.each([
    'untrusted.example',
    'supabase.co.untrusted.example',
    '169.254.169.254',
    '10.0.0.1',
    '192.168.1.10',
  ])('rejects non-allowlisted or private host %s', (hostname) => {
    expect(isAllowedHost(hostname)).toBe(false);
  });
});
