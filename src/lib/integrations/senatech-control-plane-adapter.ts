export const MOUSEAI_PROJECT_ID = 'mauseai' as const;

export const MOUSEAI_CONTROL_PLANE_TASKS = [
  'task_execute',
  'task_review',
  'task_summary',
] as const;

export type MouseAiControlPlaneTask = (typeof MOUSEAI_CONTROL_PLANE_TASKS)[number];

const REQUEST_ID_RE = /^[A-Za-z0-9_.:/-]{1,128}$/;
const TENANT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const BLOCKED_ACTIONS = new Set([
  'purchase',
  'reservation',
  'financial_action',
  'trading_action',
]);

export interface MouseAiControlPlaneRequest {
  task: MouseAiControlPlaneTask;
  input: string;
  tenantId: string;
  requestId: string;
  actionType?: string;
}

export interface MouseAiControlPlaneEnvelope {
  project_id: typeof MOUSEAI_PROJECT_ID;
  tenant_id: string;
  request_id: string;
  task: MouseAiControlPlaneTask;
  prompt: string;
  local_only: true;
  allow_cloud: false;
  shadow_only: true;
  metadata: {
    project_id: typeof MOUSEAI_PROJECT_ID;
    tenant_id: string;
    request_id: string;
    local_only: true;
    allow_cloud: false;
    shadow_only: true;
  };
}

export interface MouseAiControlPlaneResponse {
  text: string;
  provider: string;
  model: string;
  validated: true;
  projectId: typeof MOUSEAI_PROJECT_ID;
  tenantId: string;
  requestId: string;
  shadowOnly: true;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    basis: string;
  };
}

export type MouseAiControlPlaneTransport = (
  envelope: MouseAiControlPlaneEnvelope,
  signal: AbortSignal,
) => Promise<unknown>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function validateRequest(request: MouseAiControlPlaneRequest): void {
  if (!request || typeof request.input !== 'string' || !request.input.trim()) {
    throw new Error('CONTROL_PLANE_INPUT_REQUIRED');
  }
  if (!MOUSEAI_CONTROL_PLANE_TASKS.includes(request.task)) {
    throw new Error('CONTROL_PLANE_TASK_NOT_ALLOWED');
  }
  if (typeof request.tenantId !== 'string' || !TENANT_ID_RE.test(request.tenantId)) {
    throw new Error('CONTROL_PLANE_TENANT_REQUIRED');
  }
  if (typeof request.requestId !== 'string' || !REQUEST_ID_RE.test(request.requestId)) {
    throw new Error('CONTROL_PLANE_INVALID_REQUEST_ID');
  }
  if (request.actionType && BLOCKED_ACTIONS.has(request.actionType)) {
    throw new Error('CONTROL_PLANE_APPROVAL_REQUIRED');
  }
}

function normalizeResponse(
  value: unknown,
  request: MouseAiControlPlaneRequest,
): MouseAiControlPlaneResponse {
  const envelope = record(value);
  const result = record(envelope.result);
  const usage = record(envelope.usage);
  const returnedRequestId = typeof envelope.request_id === 'string'
    ? envelope.request_id
    : request.requestId;

  if (returnedRequestId !== request.requestId) {
    throw new Error('CONTROL_PLANE_REQUEST_ID_MISMATCH');
  }

  const text = typeof result.output === 'string' ? result.output.trim() : '';
  if (!text || result.validated !== true || usage.state !== 'completed') {
    throw new Error('CONTROL_PLANE_NOT_COMPLETED');
  }

  return {
    text,
    provider: typeof result.provider === 'string' ? result.provider : 'unknown',
    model: typeof result.model === 'string' ? result.model : 'unknown',
    validated: true,
    projectId: MOUSEAI_PROJECT_ID,
    tenantId: request.tenantId,
    requestId: request.requestId,
    shadowOnly: true,
    usage: {
      inputTokens: finiteNumber(usage.input_tokens),
      outputTokens: finiteNumber(usage.output_tokens),
      totalTokens: finiteNumber(usage.total_tokens),
      basis: typeof usage.usage_basis === 'string' ? usage.usage_basis : 'unknown',
    },
  };
}

/**
 * Optional MouseAI project boundary for the Senatech Control Plane.
 *
 * No network transport is installed by default. A trusted caller must inject
 * one explicitly, so local tests and the default runtime remain local-only,
 * cloud-disabled, and shadow-only.
 */
export class SenatechControlPlaneAdapter {
  constructor(private readonly transport?: MouseAiControlPlaneTransport) {}

  isConfigured(): boolean {
    return typeof this.transport === 'function';
  }

  async execute(request: MouseAiControlPlaneRequest): Promise<MouseAiControlPlaneResponse> {
    validateRequest(request);
    if (!this.transport) {
      throw new Error('CONTROL_PLANE_NOT_CONFIGURED');
    }

    const envelope: MouseAiControlPlaneEnvelope = {
      project_id: MOUSEAI_PROJECT_ID,
      tenant_id: request.tenantId,
      request_id: request.requestId,
      task: request.task,
      prompt: request.input.trim(),
      local_only: true,
      allow_cloud: false,
      shadow_only: true,
      metadata: {
        project_id: MOUSEAI_PROJECT_ID,
        tenant_id: request.tenantId,
        request_id: request.requestId,
        local_only: true,
        allow_cloud: false,
        shadow_only: true,
      },
    };

    const controller = new AbortController();
    try {
      const response = await this.transport(envelope, controller.signal);
      return normalizeResponse(response, request);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('CONTROL_PLANE_')) {
        throw error;
      }
      throw new Error('CONTROL_PLANE_UNAVAILABLE');
    } finally {
      controller.abort();
    }
  }
}

