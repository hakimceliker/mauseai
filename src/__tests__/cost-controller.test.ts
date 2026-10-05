import { describe, expect, it } from 'vitest';
import { evaluateCost } from '@/src/core/cost/cost-controller';

describe('cost controller', () => {
  it('allows work below the alarm threshold', () => {
    expect(evaluateCost({ spentCents: 100, estimatedCents: 100, budgetLimitCents: 1000 }).decision).toBe('ALLOW');
  });

  it('alerts at the configured threshold', () => {
    expect(evaluateCost({ spentCents: 700, estimatedCents: 100, budgetLimitCents: 1000 }).decision).toBe('ALERT');
  });

  it('blocks projected budget overflow', () => {
    expect(evaluateCost({ spentCents: 900, estimatedCents: 200, budgetLimitCents: 1000 })).toMatchObject({
      decision: 'BLOCKED',
      projectedCents: 1100,
      remainingCents: -100,
    });
  });

  it('supports unconfigured limits without inventing a budget', () => {
    expect(evaluateCost({ spentCents: 500, estimatedCents: 50, budgetLimitCents: null })).toMatchObject({
      decision: 'ALLOW',
      remainingCents: null,
      utilizationPercent: null,
    });
  });

  it('blocks invalid negative values', () => {
    expect(evaluateCost({ spentCents: -1, estimatedCents: 10, budgetLimitCents: 100 }).decision).toBe('BLOCKED');
  });
});
