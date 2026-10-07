import type { AIMessage, AIResponse } from './base-provider';

export interface ControlPlaneContext {
  /** Set only after server-side task/auth tenant ownership verification. */
  tenantId: string;
  requestId: string;
}

export class ControlPlaneError extends Error {
  constructor(code: string) {
    super(code);
    this.name = 'ControlPlaneError';
  }
}

/** Opt-in single-tenant service binding. No retry, fallback, or raw error logging. */
export async function callControlPlane(
  messages: AIMessage[],
  context?: ControlPlaneContext,
): Promise<AIResponse> {
  const tenant = process.env.SENATECH_CONTROL_PLANE_TENANT_ID;
  const token = process.env.SENATECH_CONTROL_PLANE_TOKEN;
  const endpoint = process.env.SENATECH_CONTROL_PLANE_URL;
  if (!tenant || !token || !endpoint || !context ||
      context.tenantId !== tenant ||
      !/^[A-Za-z0-9_.:-]{1,200}$/.test(context.requestId)) {
    throw new ControlPlaneError('control_plane_binding_rejected');
  }
  let url: URL;
  try {
    url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.search || url.hash || url.pathname !== '/') throw new Error();
  } catch {
    throw new ControlPlaneError('control_plane_url_invalid');
  }
  let response: Response;
  try {
    response = await fetch(new URL('/v1/execute', url), {
      method: 'POST',
      redirect: 'error',
      headers: {
        'content-type': 'application/json',
        'x-control-token': token,
        'x-request-id': context.requestId,
      },
      body: JSON.stringify({
        prompt: messages.map(message => `${message.role}: ${message.content}`).join('\n'),
        client: 'mouseai',
        required_capabilities: ['text'],
        risk: 'low',
        metadata: {
          tenant_id: context.tenantId,
          project_id: 'mouseai',
          request_id: context.requestId,
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) throw new Error();
    const payload = await response.json() as {
      request_id?: unknown;
      decision?: { approval_required?: unknown; status?: unknown };
      result?: { validated?: unknown; output?: unknown; error?: unknown };
    };
    if (payload.request_id !== context.requestId ||
        payload.decision?.approval_required !== false ||
        payload.decision.status !== 'selected' ||
        payload.result?.validated !== true ||
        payload.result.error ||
        typeof payload.result.output !== 'string' || !payload.result.output.trim()) {
      throw new Error();
    }
    // Usage is unknown unless a versioned, validated metering contract exists.
    return { role: 'assistant', content: payload.result.output, provider: 'senatech-control-plane' };
  } catch {
    // An ambiguous timeout can already have executed upstream: caller must not retry.
    throw new ControlPlaneError('control_plane_execution_unconfirmed');
  }
}
