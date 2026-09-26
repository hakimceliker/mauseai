import { inngest } from "@/src/inngest/client";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import {
  completeStep,
  failStep,
  startTask,
} from "@/src/lib/tasks/state-machine";
import { StepStatus, TaskStatus } from "@/src/types/enums";
import {
  isTransientError,
  toNonRetriableError,
} from "@/src/lib/tasks/retry-policy";
import {
  getLatestCheckpoint,
  saveCheckpoint,
} from "@/src/server/services/checkpoint.service";
import { routeMockAI } from "@/src/lib/ai/mock-router";
import { recordCost } from "@/src/server/services/cost-service";
import { writeAudit } from "@/src/server/services/audit-service";

export const taskWorker = inngest.createFunction(
  {
    id: "mouseai-task-worker",
    retries: 3,
    concurrency: { limit: 10 },
    triggers: [{ event: "mouseai/task.created" }],
  },
  async ({ event, step }) => {
    const { taskId, tenantId, stepId } = event.data as {
      taskId: string;
      tenantId: string;
      stepId: string;
    };
    const supabase = getSupabaseAdminClient();

    const task = await step.run("load-task", async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .eq("tenant_id", tenantId)
        .single();
      if (error) throw new Error(`task_load_failed:${error.message}`);
      return data;
    });

    const checkpoint = await step.run("load-latest-checkpoint", async () =>
      getLatestCheckpoint(taskId, tenantId),
    );

    const state = startTask({
      taskStatus: task.status as TaskStatus,
      stepStatus:
        (checkpoint?.state?.stepStatus as StepStatus | undefined) ??
        StepStatus.PENDING,
      stepId,
      checkpointVersion: checkpoint?.version ?? 0,
    });

    await step.run("mark-running", async () => {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: state.taskStatus,
          started_at: task.started_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId)
        .eq("tenant_id", tenantId);
      if (error) throw new Error(`task_start_failed:${error.message}`);
      const { error: stepError } = await supabase
        .from("steps")
        .update({
          status: StepStatus.RUNNING,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", stepId)
        .eq("task_id", taskId)
        .eq("tenant_id", tenantId);
      if (stepError) throw new Error(`step_start_failed:${stepError.message}`);
    });

    try {
      const aiResult = await step.run(`ai-${taskId}:${stepId}:1`, async () =>
        routeMockAI({ taskId, goal: task.goal, riskLevel: task.risk_level }),
      );
      await step.run(`cost-${taskId}:${stepId}:1`, async () =>
        recordCost({
          tenantId,
          taskId,
          stepId,
          provider: aiResult.provider,
          costCents: aiResult.costCents,
          inputTokens: aiResult.inputTokens,
          outputTokens: aiResult.outputTokens,
        }),
      );
      const completed = completeStep(state);
      const deterministicStepId = `step-${taskId}:${stepId}:1`;
      await step.run(deterministicStepId, async () => {
        await saveCheckpoint({
          tenantId,
          taskId,
          stepId,
          state: { ...completed, ai: aiResult.output },
          version: completed.checkpointVersion,
        });
        const { error: taskError } = await supabase
          .from("tasks")
          .update({
            status: TaskStatus.COMPLETED,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("tenant_id", tenantId);
        if (taskError)
          throw new Error(`task_complete_failed:${taskError.message}`);
        const { error: stepError } = await supabase
          .from("steps")
          .update({
            status: StepStatus.COMPLETED,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", stepId)
          .eq("task_id", taskId)
          .eq("tenant_id", tenantId);
        if (stepError)
          throw new Error(`step_complete_failed:${stepError.message}`);
      });
      await step.run("audit-step-completed", async () =>
        writeAudit({
          tenantId,
          taskId,
          stepId,
          actorType: "worker",
          actorId: "inngest",
          action: "step.completed",
          resourceType: "step",
          resourceId: stepId,
          costCents: aiResult.costCents,
          payload: { provider: aiResult.provider },
        }),
      );
      return {
        taskId,
        status: TaskStatus.COMPLETED,
        checkpointVersion: completed.checkpointVersion,
      };
    } catch (error) {
      const failed = failStep(state);
      const normalizedError = toNonRetriableError(error);
      await supabase.from("audit_logs").insert({
        tenant_id: tenantId,
        task_id: taskId,
        step_id: stepId,
        actor_type: "worker",
        actor_id: "inngest",
        action: "step.retry_or_failed",
        resource_type: "step",
        resource_id: stepId,
        payload: {
          errorCode: (error as { code?: string })?.code ?? "UNKNOWN",
          message: normalizedError.message,
        },
      });
      if (!isTransientError(error)) {
        await supabase
          .from("tasks")
          .update({
            status: TaskStatus.FAILED,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("tenant_id", tenantId);
        await supabase
          .from("steps")
          .update({
            status: StepStatus.FAILED,
            error: normalizedError.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", stepId)
          .eq("task_id", taskId)
          .eq("tenant_id", tenantId);
        await saveCheckpoint({
          tenantId,
          taskId,
          stepId,
          state: failed,
          version: failed.checkpointVersion,
        });
      }
      throw normalizedError;
    }
  },
);
