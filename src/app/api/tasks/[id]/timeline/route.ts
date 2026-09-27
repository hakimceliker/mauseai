import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { LiveTaskService } from '@/src/lib/services/live-task-service';
import { CheckpointRepository } from '@/src/lib/db/checkpoint-repository';
import { ApiErrorHandler, NotFoundError } from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';
import * as Domain from '@/src/types/domain';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuthAsync(request);
    const task = await LiveTaskService.getTask(params.id as Domain.TaskId, auth.tenantId);
    if (!task) throw new NotFoundError({ resource: 'task', id: params.id });

    const checkpoints = (process.env.AUTH_PROVIDER ?? 'mock').toLowerCase() === 'mock'
      ? []
      : await CheckpointRepository.getTaskCheckpoints(task.id);

    const response = NextResponse.json({
      success: true,
      data: checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        task_id: checkpoint.task_id,
        step_id: checkpoint.step_id,
        state: checkpoint.state,
        created_at: checkpoint.created_at.toISOString(),
      })),
    });
    addSecurityHeaders(response);
    return response;
  } catch (error) {
    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'GET',
    });
  }
}
