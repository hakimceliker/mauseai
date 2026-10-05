export type CiDoctorStatus =
  | 'PASS'
  | 'PENDING'
  | 'CODE_FAILURE'
  | 'INFRASTRUCTURE_BLOCKED';

export interface CiRunSnapshot {
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: string | null;
  executableStepsStarted: number;
}

export interface CiDoctorResult {
  status: CiDoctorStatus;
  reason: string;
  infrastructureBlocked: boolean;
}

/**
 * Classifies a CI run without treating a runner failure before any executable
 * step as a product regression. Missing or non-terminal runs remain pending.
 */
export function classifyCiRun(snapshot: CiRunSnapshot): CiDoctorResult {
  if (snapshot.status !== 'completed' || !snapshot.conclusion) {
    return {
      status: 'PENDING',
      reason: 'CI run has not reached a terminal conclusion',
      infrastructureBlocked: false,
    };
  }

  if (snapshot.conclusion === 'success') {
    return {
      status: 'PASS',
      reason: 'all required CI jobs completed successfully',
      infrastructureBlocked: false,
    };
  }

  if (snapshot.executableStepsStarted === 0) {
    return {
      status: 'INFRASTRUCTURE_BLOCKED',
      reason: 'runner_failed_before_steps',
      infrastructureBlocked: true,
    };
  }

  return {
    status: 'CODE_FAILURE',
    reason: 'an executable CI step started and the run failed',
    infrastructureBlocked: false,
  };
}
