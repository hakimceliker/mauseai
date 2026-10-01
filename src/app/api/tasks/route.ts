import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { LiveTaskService } from '@/src/lib/services/live-task-service';
import { inngest } from '@/src/inngest/client';
import { CreateTaskRequestSchema } from '@/src/lib/schemas/api-requests';
import * as Domain from '@/src/types/domain';
import {
  ApiErrorHandler,
  ValidationError,
  AuthError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await requireAuthAsync(request);

    // Parse request body
    const body = await request.json();
    const validation = CreateTaskRequestSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(validation.error.flatten());
    }

    const hasExecutionContract = Boolean(
      validation.data.expected_output || validation.data.success_criteria
    );
    const approvalState = validation.data.approval_state ??
      (hasExecutionContract ? 'pending' : 'approved');

    // Create task
    const task = await LiveTaskService.createTask(
      auth.tenantId,
      auth.userId,
      validation.data.workflow_id as Domain.WorkflowId,
      {
        ...(validation.data.input || {}),
        ...(validation.data.expected_output || validation.data.success_criteria
          ? {
              __execution_contract: {
                expected_output: validation.data.expected_output,
                success_criteria: validation.data.success_criteria,
                approval_state: approvalState,
              },
            }
          : {}),
      }
    );

    if (
      approvalState === 'approved' &&
      (process.env.AUTH_PROVIDER ?? 'mock').toLowerCase() !== 'mock'
    ) {
      await inngest.send({
        name: 'task.execute',
        data: {
          taskId: task.id,
          tenantId: auth.tenantId,
          workflowId: task.workflow_id,
        },
      });
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
      { status: 201 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'POST',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'POST',
    });
  }
}

/**
 * GET /api/tasks
 * List tasks for current tenant (pagination support in future)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await requireAuthAsync(request);

    // Get all tasks for tenant
    const tasks = await LiveTaskService.getTenantTasks(auth.tenantId);

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
