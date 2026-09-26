import { safeErrorMessage } from "@/src/lib/security/redact";

/**
 * Normalised provider failure. The message never contains request content or
 * credentials; `retryable` tells the router whether falling back is sensible.
 */
export type ProviderErrorCode =
  | "auth_failed"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "bad_request"
  | "refused"
  | "empty_response";

export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly code: ProviderErrorCode,
    public readonly retryable: boolean,
    public readonly status?: number,
    detail?: string,
  ) {
    super(`${provider}:${code}${detail ? `:${safeErrorMessage(detail, process.env, 160)}` : ""}`);
    this.name = "ProviderError";
  }
}

/** Maps an SDK error (Anthropic or OpenAI — both expose `status` and typed class names) to a ProviderError. */
export function toProviderError(provider: string, error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  const name = error instanceof Error ? error.constructor.name : "";
  const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : undefined;
  if (name === "APIConnectionTimeoutError" || (error instanceof Error && error.name === "AbortError")) return new ProviderError(provider, "timeout", true);
  if (name === "APIConnectionError") return new ProviderError(provider, "unavailable", true);
  if (status === 401 || status === 403) return new ProviderError(provider, "auth_failed", false, status);
  if (status === 429) return new ProviderError(provider, "rate_limited", true, status);
  if (status !== undefined && status >= 500) return new ProviderError(provider, "unavailable", true, status);
  if (status !== undefined && status >= 400) return new ProviderError(provider, "bad_request", false, status);
  return new ProviderError(provider, "unavailable", true, status, error instanceof Error ? error.message : undefined);
}
