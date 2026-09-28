export interface RequestPolicy {
  timeoutMs?: number;
  maxRetries?: number;
}

const numberEnv = (name: string, fallback: number, min: number, max: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
};

export async function requestWithPolicy(input: RequestInfo | URL, init: RequestInit, policy: RequestPolicy = {}): Promise<Response> {
  const timeoutMs = policy.timeoutMs ?? numberEnv('AI_REQUEST_TIMEOUT_MS', 30_000, 100, 120_000);
  const maxRetries = policy.maxRetries ?? numberEnv('AI_MAX_RETRIES', 2, 0, 5);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!isRetryableStatus(response.status) || attempt === maxRetries) return response;
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error('AI_REQUEST_FAILED');
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function safeProviderDetail(detail: string): string {
  return detail.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, '[REDACTED]').replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]').slice(0, 200);
}
