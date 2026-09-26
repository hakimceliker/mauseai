import { safeErrorMessage } from "@/src/lib/security/redact";

/**
 * Outbound HTTP for channel and CRM adapters: per-attempt timeout, bounded
 * retries with exponential backoff (honouring Retry-After) on network errors,
 * timeouts, 429 and 5xx. 4xx responses other than 408/429 are not retried.
 * Error messages never include the URL (webhook URLs are secrets).
 */

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export interface ResilientOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

export class HttpCallError extends Error {
  constructor(
    public readonly code: "timeout" | "network" | "http_error",
    public readonly status: number | null,
    public readonly retryable: boolean,
    public readonly attempts: number,
    detail?: string,
  ) {
    super(`${code}${status ? `_${status}` : ""}${detail ? `:${detail}` : ""}`);
    this.name = "HttpCallError";
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(30_000, Math.max(0, seconds * 1000));
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.min(30_000, Math.max(0, date - Date.now())) : null;
}

export async function resilientFetch(url: string, init: RequestInit, options: ResilientOptions = {}): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const sleep = options.sleep ?? defaultSleep;
  const retries = options.retries ?? 2;
  const base = options.baseDelayMs ?? 250;
  let lastError: HttpCallError | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    let delay = base * 2 ** (attempt - 1);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      if (response.ok) return response;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      const body = await response.text().catch(() => "");
      lastError = new HttpCallError("http_error", response.status, retryable, attempt, safeErrorMessage(body, process.env, 120) || undefined);
      if (!retryable) throw lastError;
      delay = retryAfterMs(response) ?? delay;
    } catch (error) {
      if (error instanceof HttpCallError && !error.retryable) throw error;
      if (!(error instanceof HttpCallError)) {
        const aborted = error instanceof Error && error.name === "AbortError";
        lastError = new HttpCallError(aborted ? "timeout" : "network", null, true, attempt);
      }
    } finally {
      clearTimeout(timer);
    }
    if (attempt <= retries) await sleep(delay);
  }
  throw lastError ?? new HttpCallError("network", null, true, retries + 1);
}
