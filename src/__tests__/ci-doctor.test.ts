import { describe, expect, it } from 'vitest';
import { classifyCiRun } from '@/src/core/ci/ci-doctor';

describe('CI Doctor', () => {
  it('keeps queued and running jobs pending', () => {
    expect(classifyCiRun({ status: 'in_progress', conclusion: null, executableStepsStarted: 0 })).toMatchObject({
      status: 'PENDING',
      infrastructureBlocked: false,
    });
  });

  it('passes successful completed runs', () => {
    expect(classifyCiRun({ status: 'completed', conclusion: 'success', executableStepsStarted: 3 })).toMatchObject({
      status: 'PASS',
      infrastructureBlocked: false,
    });
  });

  it('classifies a failure before executable steps as infrastructure blocked', () => {
    expect(classifyCiRun({ status: 'completed', conclusion: 'failure', executableStepsStarted: 0 })).toEqual({
      status: 'INFRASTRUCTURE_BLOCKED',
      reason: 'runner_failed_before_steps',
      infrastructureBlocked: true,
    });
  });

  it('classifies failures after executable work as code failures', () => {
    expect(classifyCiRun({ status: 'completed', conclusion: 'failure', executableStepsStarted: 1 })).toMatchObject({
      status: 'CODE_FAILURE',
      infrastructureBlocked: false,
    });
  });
});
