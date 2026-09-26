import { inngest } from '../client';
import { TaskRepository } from '@/src/lib/db/task-repository';
import { CheckpointRepository } from '@/src/lib/db/checkpoint-repository';
import * as Domain from '@/src/types/domain';

/**
 * Execute a task with step-based execution
 * Saves checkpoint after each step for resumption capability
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

      // Mock workflow steps for Phase 5
      // In real implementation, would load workflow from DB
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

      for (const workflowStep of workflowSteps) {
        // Execute step
        const stepResult = await step.run(`execute-step-${workflowStep.order}`, async () => {
          // Simulate step execution
          await new Promise(resolve => setTimeout(resolve, 100));

          return {
            step_id: workflowStep.id,
            step_name: workflowStep.name,
            result: `Completed: ${workflowStep.name}`,
          };
        });

        // Save checkpoint after step execution
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

      // Update task to completed
      await step.run('update-task-completed', async () => {
        await TaskRepository.updateTaskStatus(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          Domain.TaskStatus.COMPLETED,
          results
        );
      });

      return {
        success: true,
        taskId,
        results,
      };
    } catch (error) {
      // Update task to failed
      await step.run('update-task-failed', async () => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await TaskRepository.updateTaskStatus(
          taskId as Domain.TaskId,
          tenantId as Domain.TenantId,
          Domain.TaskStatus.FAILED,
          undefined,
          errorMessage
        );
      });

      throw error;
    }
  }
);
