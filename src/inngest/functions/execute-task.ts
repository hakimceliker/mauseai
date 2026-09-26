import { inngest } from '../client';
import { TaskRepository } from '@/src/lib/db/task-repository';
import { CheckpointRepository } from '@/src/lib/db/checkpoint-repository';
import { IdempotencyRepository } from '@/src/lib/db/idempotency-repository';
import { CostTracker } from '@/src/lib/cost/cost-tracker';
import { AuditService } from '@/src/lib/audit/audit-service';
import { AIRouter } from '@/src/lib/ai/ai-router';
import * as Domain from '@/src/types/domain';

/**
 * Execute a task with step-based execution
 * Saves checkpoint after each step for resumption capability
 * Uses idempotency keys to prevent duplicate execution on retry
 * Includes timeout and retry handling
 */
export const executeTask = inngest.createFunction(
  {
    id: 'execute-task',
    name: 'Execute Task',
  },
  { event: 'task.execute' },
  async ({ event, step }) => {
    const { taskId, tenantId } = event.data;

    try {
      // Update task status to running
      await step.run('update-task-status', async () => {
        await TaskRepository.updateTaskStatus(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          Domain.TaskStatus.RUNNING
        );
      });

      // Mock workflow steps
      const workflowSteps = [
        {
          id: 'step-1' as Domain.StepId,
          name: 'Step 1: Process Input',
          order: 1,
        },
        {
          id: 'step-2' as Domain.StepId,
          name: 'Step 2: Transform Data',
          order: 2,
        },
        {
          id: 'step-3' as Domain.StepId,
          name: 'Step 3: Final Result',
          order: 3,
        },
      ];

      // Execute each step
      const results: Record<string, unknown> = {};

      let totalCost = 0;

      for (const workflowStep of workflowSteps) {
        // Check cost limit before executing
        await step.run(
          `check-cost-limit-step-${workflowStep.order}`,
          async () => {
            const remaining = await CostTracker.getTenantRemaining(
              tenantId as Domain.TenantId
            );
            const estimatedCost = 0.0001; // Estimate per step

            if (remaining < estimatedCost) {
              await AuditService.logCostLimitExceeded(
                tenantId as Domain.TenantId,
                taskId as Domain.TaskId,
                totalCost,
                remaining + totalCost
              );
              throw new Error('Tenant cost limit exceeded');
            }
          }
        );

        // Check idempotency before executing
        const cachedResult = await step.run(
          `check-idempotency-step-${workflowStep.order}`,
          async () => {
            return await IdempotencyRepository.checkIdempotency(
              taskId as Domain.TaskId,
              workflowStep.id
            );
          }
        );

        let stepResult: Record<string, unknown> | null = cachedResult;
        let stepCost = 0;

        // If not cached, execute step
        if (!cachedResult) {
          stepResult = (await step.run(
            `execute-step-${workflowStep.order}`,
            async () => {
              // Call AI provider for this step
              const aiResponse = await AIRouter.execute([
                {
                  role: 'user',
                  content: `Execute ${workflowStep.name}`,
                },
              ]);

              stepCost = aiResponse.cost || 0.0001;

              return {
                step_id: workflowStep.id,
                step_name: workflowStep.name,
                result: aiResponse.content,
                provider: aiResponse.provider,
                tokens_used: aiResponse.tokens_used,
                cost: stepCost,
                executed_at: new Date().toISOString(),
              };
            }
          )) as Record<string, unknown>;

          totalCost += stepCost;

          // Record execution for idempotency
          await step.run(
            `record-idempotency-step-${workflowStep.order}`,
            async () => {
              await IdempotencyRepository.recordExecution(
                taskId as Domain.TaskId,
                workflowStep.id,
                stepResult as Record<string, unknown>
              );
            }
          );

          // Log cost incurred
          await step.run(
            `log-cost-step-${workflowStep.order}`,
            async () => {
              const aiProvider = (stepResult as Record<string, unknown>)?.provider || 'unknown';
              await AuditService.logCostIncurred(
                tenantId as Domain.TenantId,
                taskId as Domain.TaskId,
                stepCost,
                aiProvider as string
              );
            }
          );
        }

        // Save checkpoint after step execution (cached or fresh)
        await step.run(`checkpoint-step-${workflowStep.order}`, async () => {
          await CheckpointRepository.saveCheckpoint(
            taskId as Domain.TaskId,
            workflowStep.id,
            {
              completed_steps: results,
              last_step: workflowStep.id,
              last_step_result: stepResult,
            }
          );
        });

        results[`step_${workflowStep.order}`] = stepResult;
      }

      // Update task to completed and record final cost
      await step.run('update-task-completed', async () => {
        await TaskRepository.updateTaskStatus(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          Domain.TaskStatus.COMPLETED,
          results
        );
        await CostTracker.recordTaskCost(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          totalCost
        );
        await AuditService.logTaskCompleted(
          tenantId as Domain.TenantId,
          taskId as Domain.TaskId,
          totalCost
        );
      });

      return {
        success: true,
        taskId,
        results,
        totalCost,
      };
    } catch (error) {
      // Update task to failed and log error
      await step.run('update-task-failed', async () => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await TaskRepository.updateTaskStatus(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          Domain.TaskStatus.FAILED,
          undefined,
          errorMessage
        );
        await AuditService.logTaskFailed(
          tenantId as Domain.TenantId,
          taskId as Domain.TaskId,
          errorMessage
        );
      });

      throw error;
    }
  }
);
