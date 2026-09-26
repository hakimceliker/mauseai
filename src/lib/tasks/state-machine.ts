import { StepStatus, TaskStatus } from "@/src/types/enums";

export type LinearTaskState = {
  taskStatus: TaskStatus;
  stepStatus: StepStatus;
  stepId: string;
  checkpointVersion: number;
};

export function startTask(state: LinearTaskState): LinearTaskState {
  if (
    [TaskStatus.CANCELLED, TaskStatus.COMPLETED, TaskStatus.FAILED].includes(
      state.taskStatus,
    )
  )
    return state;
  return {
    ...state,
    taskStatus: TaskStatus.RUNNING,
    stepStatus: StepStatus.RUNNING,
  };
}

export function completeStep(state: LinearTaskState): LinearTaskState {
  return {
    ...state,
    taskStatus: TaskStatus.COMPLETED,
    stepStatus: StepStatus.COMPLETED,
    checkpointVersion: state.checkpointVersion + 1,
  };
}

export function failStep(state: LinearTaskState): LinearTaskState {
  return {
    ...state,
    taskStatus: TaskStatus.FAILED,
    stepStatus: StepStatus.FAILED,
    checkpointVersion: state.checkpointVersion + 1,
  };
}
