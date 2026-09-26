import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { TaskService } from '@/src/lib/services/task-service';
import * as Domain from '@/src/types/domain';

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
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found',
        },
        { status: 404 }
      );
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

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
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
      return NextResponse.json(
        {
          success: false,
          error: 'Task not found or cannot be cancelled',
        },
        { status: 404 }
      );
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

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
