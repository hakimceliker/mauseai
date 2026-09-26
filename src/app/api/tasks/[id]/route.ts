import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { TaskService } from '@/src/lib/services/task-service';
import * as Domain from '@/src/types/domain';
import {
  ApiErrorHandler,
  AuthError,
  NotFoundError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

/**
 * GET /api/tasks/:id
 * Get a specific task (tenant isolation)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = requireAuth(request);

    // Get task
    const task = TaskService.getTask(params.id as Domain.TaskId, auth.tenantId);

    if (!task) {
      throw new NotFoundError({ resource: 'task', id: params.id });
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
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const auth = requireAuth(request);

    // Cancel task
    const task = TaskService.cancelTask(params.id as Domain.TaskId, auth.tenantId);

    if (!task) {
      throw new NotFoundError({ resource: 'task', id: params.id });
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
