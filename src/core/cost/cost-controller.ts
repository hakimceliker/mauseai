export type CostDecision = 'ALLOW' | 'ALERT' | 'BLOCKED';

export interface CostInput {
  spentCents: number;
  estimatedCents: number;
  budgetLimitCents: number | null;
  alarmThresholdPercent?: number;
}

export interface CostEvaluation {
  decision: CostDecision;
  projectedCents: number;
  remainingCents: number | null;
  utilizationPercent: number | null;
  reason: string;
}

export function evaluateCost(input: CostInput): CostEvaluation {
  const projectedCents = input.spentCents + input.estimatedCents;
  const threshold = input.alarmThresholdPercent ?? 80;

  if (input.budgetLimitCents === null) {
    return {
      decision: 'ALLOW',
      projectedCents,
      remainingCents: null,
      utilizationPercent: null,
      reason: 'no configured budget limit; record actual cost and monitor',
    };
  }

  if (input.budgetLimitCents < 0 || input.spentCents < 0 || input.estimatedCents < 0) {
    return {
      decision: 'BLOCKED',
      projectedCents,
      remainingCents: Math.max(0, input.budgetLimitCents - input.spentCents),
      utilizationPercent: null,
      reason: 'cost values must be non-negative',
    };
  }

  const remainingCents = input.budgetLimitCents - projectedCents;
  const utilizationPercent = (projectedCents / input.budgetLimitCents) * 100;

  if (projectedCents > input.budgetLimitCents) {
    return { decision: 'BLOCKED', projectedCents, remainingCents, utilizationPercent, reason: 'projected cost exceeds budget' };
  }

  if (utilizationPercent >= threshold) {
    return { decision: 'ALERT', projectedCents, remainingCents, utilizationPercent, reason: 'projected cost reached the alarm threshold' };
  }

  return { decision: 'ALLOW', projectedCents, remainingCents, utilizationPercent, reason: 'projected cost is within budget' };
}
