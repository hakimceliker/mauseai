import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Vercel deployment contract', () => {
  it('defines framework, region, and bounded server functions', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      framework?: string;
      regions?: string[];
      functions?: Record<string, { maxDuration?: number }>;
    };
    expect(config.framework).toBe('nextjs');
    expect(config.regions).toContain('fra1');
    expect(config.functions?.['src/app/api/inngest/route.ts']?.maxDuration).toBe(60);
    expect(config.functions?.['src/app/api/tasks/**/*.ts']?.maxDuration).toBe(60);
  });

  it('contains no secret values', () => {
    const text = readFileSync('vercel.json', 'utf8');
    expect(text).not.toMatch(/sk_(?:live|test)_/i);
    expect(text).not.toMatch(/service_role\s*[:=]\s*['"][^'"]+['"]/i);
  });
});
