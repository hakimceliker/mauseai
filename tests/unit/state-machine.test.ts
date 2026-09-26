import { describe, expect, it } from "vitest";
import { completeStep, startTask } from "@/src/lib/tasks/state-machine";
import { StepStatus, TaskStatus } from "@/src/types/enums";

describe("task state machine", () => {
  it("starts a pending task", () => {
    const result = startTask({
      taskStatus: TaskStatus.PENDING,
      stepStatus: StepStatus.PENDING,
      stepId: "step",
      checkpointVersion: 0,
    });
    expect(result.taskStatus).toBe(TaskStatus.RUNNING);
    expect(result.stepStatus).toBe(StepStatus.RUNNING);
  });
  it("completes and increments checkpoint version", () => {
    const result = completeStep({
      taskStatus: TaskStatus.RUNNING,
      stepStatus: StepStatus.RUNNING,
      stepId: "step",
      checkpointVersion: 1,
    });
    expect(result.taskStatus).toBe(TaskStatus.COMPLETED);
    expect(result.checkpointVersion).toBe(2);
  });
});
