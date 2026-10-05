import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, resolveAuthProvider } from '@/src/lib/auth/mock-auth';
import { LiveTaskService } from '@/src/lib/services/live-task-service';
import * as Domain from '@/src/types/domain';
import {
  ApiErrorHandler,
  AuthError,
  NotFoundError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';
import { CheckpointRepository } from '@/src/lib/db/checkpoint-repository';

/**
 * GET /api/tasks/:id
 * Get a specific task (tenant isolation)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const auth = await requireAuthAsync(request);

    // Get task
    const task = await LiveTaskService.getTask(id as Domain.TaskId, auth.tenantId);

    if (!task) {
      throw new NotFoundError({ resource: 'task', id });
    }

    const checkpoints = resolveAuthProvider() === 'mock'
      ? []
      : await CheckpointRepository.getTaskCheckpoints(task.id);

    // Format response
    const response = {
      id: task.id,
      tenant_id: task.tenant_id,
      user_id: task.user_id,
      workflow_id: task.workflow_id,
      status: task.status,
      input: task.input,
      output: task.output,
      error: task.error,
      cost_estimate: task.cost_estimate,
      cost_actual: task.cost_actual,
      created_at: task.created_at.toISOString(),
      started_at: task.started_at?.toISOString(),
      completed_at: task.completed_at?.toISOString(),
      checkpoints: checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        task_id: checkpoint.task_id,
        step_id: checkpoint.step_id,
        state: checkpoint.state,
        created_at: checkpoint.created_at.toISOString(),
      })),
    };

    const result = NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'GET',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'GET',
    });
  }
}

/**
 * DELETE /api/tasks/:id
 * Cancel a task (tenant isolation)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const auth = await requireAuthAsync(request);

    // Cancel task
    const task = await LiveTaskService.cancelTask(id as Domain.TaskId, auth.tenantId);

    if (!task) {
      throw new NotFoundError({ resource: 'task', id });
    }

    // Format response
    const response = {
      id: task.id,
      tenant_id: task.tenant_id,
      user_id: task.user_id,
      workflow_id: task.workflow_id,
      status: task.status,
      input: task.input,
      output: task.output,
      error: task.error,
      cost_estimate: task.cost_estimate,
      cost_actual: task.cost_actual,
      created_at: task.created_at.toISOString(),
      started_at: task.started_at?.toISOString(),
      completed_at: task.completed_at?.toISOString(),
    };

    const result = NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'DELETE',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'DELETE',
    });
  }
}
