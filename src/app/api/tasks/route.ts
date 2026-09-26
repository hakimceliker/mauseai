import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { TaskService } from '@/src/lib/services/task-service';
import { CreateTaskRequestSchema } from '@/src/lib/schemas/api-requests';
import * as Domain from '@/src/types/domain';

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = requireAuth(request);

    // Parse request body
    const body = await request.json();
    const validation = CreateTaskRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validation.error.message}`,
        },
        { status: 400 }
      );
    }

    // Create task
    const task = TaskService.createTask(
      auth.tenantId,
      auth.userId,
      validation.data.workflow_id as Domain.WorkflowId,
      validation.data.input || {}
    );

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
      { status: 201 }
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
 * GET /api/tasks
 * List tasks for current tenant (pagination support in future)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = requireAuth(request);

    // Get all tasks for tenant
    const tasks = TaskService.getTenantTasks(auth.tenantId);

    // Format responses
    const response = tasks.map(task => ({
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
    }));

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
