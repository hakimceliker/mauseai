import { describe, expect, it } from 'vitest';
import { classifyFailure, decideRecovery } from '@/src/core/recovery/recovery-engine';

const error = (message: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(message), extra);

describe('recovery engine', () => {
  it('classifies transient failures and retries within budget', () => {
    expect(classifyFailure(error('request timeout'))).toBe('TIMEOUT');
    expect(decideRecovery({ error: error('request timeout'), attempt: 1, maxAttempts: 3 })).toMatchObject({
      action: 'RETRY',
      retryable: true,
    });
  });

  it('uses a fallback for provider failures when available', () => {
    expect(decideRecovery({
      error: error('credential missing', { code: 'CREDENTIAL' }),
      attempt: 1,
      maxAttempts: 3,
      fallbackAvailable: true,
    }).action).toBe('FALLBACK_PROVIDER');
  });

  it('does not blindly retry authorization or validation failures', () => {
    expect(decideRecovery({
      error: error('forbidden', { status: 403 }),
      attempt: 1,
      maxAttempts: 3,
    }).action).toBe('REPLAN');
  });

  it('blocks after retry budget is exhausted', () => {
    expect(decideRecovery({
      error: error('timeout', { code: 'TIMEOUT' }),
      attempt: 3,
      maxAttempts: 3,
    }).action).toBe('BLOCKED');
  });

  it('escalates high-risk recovery to human approval', () => {
    expect(decideRecovery({
      error: error('provider failure'),
      attempt: 0,
      maxAttempts: 3,
      humanApprovalRequired: true,
    }).action).toBe('HUMAN_APPROVAL');
  });
});
