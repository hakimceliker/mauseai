export interface ContextItem {
  key: string;
  value: unknown;
  tenantId: string;
  sensitivity?: 'public' | 'internal' | 'secret' | 'personal';
}

export interface ContextRequest {
  tenantId: string;
  allowedKeys?: readonly string[];
  includeSensitive?: boolean;
  maxItems?: number;
}

export interface ContextResult {
  items: ContextItem[];
  redactedCount: number;
  rejectedCount: number;
}

const redactedValue = '[REDACTED]';

export function buildContext(items: readonly ContextItem[], request: ContextRequest): ContextResult {
  if (!request.tenantId) {
    return { items: [], redactedCount: 0, rejectedCount: items.length };
  }

  const allowed = request.allowedKeys ? new Set(request.allowedKeys) : undefined;
  let redactedCount = 0;
  let rejectedCount = 0;
  const result: ContextItem[] = [];

  for (const item of items) {
    if (item.tenantId !== request.tenantId || (allowed && !allowed.has(item.key))) {
      rejectedCount += 1;
      continue;
    }

    const sensitive = item.sensitivity === 'secret' || item.sensitivity === 'personal';
    if (sensitive && !request.includeSensitive) {
      redactedCount += 1;
      result.push({ ...item, value: redactedValue });
    } else {
      result.push({ ...item });
    }

    if (request.maxItems && result.length >= request.maxItems) break;
  }

  return { items: result, redactedCount, rejectedCount };
}
