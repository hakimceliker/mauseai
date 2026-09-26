import { NonRetriableError } from "inngest";

export type ClassifiedTaskError = Error & { status?: number; code?: string };

export function toNonRetriableError(error: unknown): Error {
  const candidate = error as ClassifiedTaskError;
  if (
    candidate?.code === "VALIDATION" ||
    candidate?.code === "BUDGET_EXCEEDED" ||
    candidate?.status === 400 ||
    candidate?.status === 404
  ) {
    return new NonRetriableError(
      candidate.message || "non_retriable_task_error",
    );
  }
  return candidate instanceof Error
    ? candidate
    : new Error("unknown_task_error");
}

export function isTransientError(error: unknown): boolean {
  const candidate = error as ClassifiedTaskError;
  return (
    candidate?.code === "TIMEOUT" ||
    candidate?.status === 429 ||
    candidate?.status === 502 ||
    candidate?.status === 503 ||
    candidate?.status === 504
  );
}
