/**
 * Runtime mode used to decide whether mock adapters are allowed.
 *
 * Mock providers, in-memory rate limiting without acknowledgement and other
 * development shortcuts are only allowed in "test" and "development". A
 * production build (NODE_ENV=production, which also covers Vercel previews)
 * must use real adapters or fail with an explicit configuration error.
 */

export type Env = Record<string, string | undefined>;
export type RuntimeMode = "production" | "development" | "test";

export function runtimeMode(env: Env = process.env): RuntimeMode {
  if (env.NODE_ENV === "test" || env.VITEST) return "test";
  if (env.NODE_ENV === "production") return "production";
  return "development";
}

export function mocksAllowed(env: Env = process.env): boolean {
  return runtimeMode(env) !== "production";
}

/** Reads a positive integer setting, falling back when unset or invalid. */
export function intSetting(env: Env, key: string, fallback: number, bounds: { min: number; max: number }): number {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) return fallback;
  return value;
}

/** Error raised when an adapter is required but its configuration is missing. It carries env var names only, never values. */
export class ConfigurationError extends Error {
  constructor(
    public readonly code: string,
    public readonly missingEnv: string[] = [],
  ) {
    super(code);
    this.name = "ConfigurationError";
  }
}
