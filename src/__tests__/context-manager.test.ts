import { describe, expect, it } from 'vitest';
import { buildContext } from '@/src/core/context/context-manager';

const items = [
  { key: 'goal', value: 'analyse', tenantId: 'tenant-a', sensitivity: 'public' as const },
  { key: 'email', value: 'user@example.test', tenantId: 'tenant-a', sensitivity: 'personal' as const },
  { key: 'apiKey', value: 'secret-value', tenantId: 'tenant-a', sensitivity: 'secret' as const },
  { key: 'otherTenant', value: 'must-not-leak', tenantId: 'tenant-b', sensitivity: 'public' as const },
];

describe('context manager', () => {
  it('filters by tenant and redacts sensitive values by default', () => {
    const result = buildContext(items, { tenantId: 'tenant-a' });
    expect(result.items).toHaveLength(3);
    expect(result.items[1].value).toBe('[REDACTED]');
    expect(result.items[2].value).toBe('[REDACTED]');
    expect(result.redactedCount).toBe(2);
    expect(result.rejectedCount).toBe(1);
  });

  it('enforces the requested key allowlist', () => {
    const result = buildContext(items, { tenantId: 'tenant-a', allowedKeys: ['goal'] });
    expect(result.items.map((item) => item.key)).toEqual(['goal']);
    expect(result.rejectedCount).toBe(3);
  });

  it('supports explicit sensitive access and a context budget', () => {
    const result = buildContext(items, { tenantId: 'tenant-a', includeSensitive: true, maxItems: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.items[1].value).toBe('user@example.test');
    expect(result.redactedCount).toBe(0);
  });

  it('fails closed without a tenant', () => {
    expect(buildContext(items, { tenantId: '' })).toEqual({
      items: [],
      redactedCount: 0,
      rejectedCount: 4,
    });
  });
});
