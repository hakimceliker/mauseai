import { intSetting, type Env } from "@/src/lib/config/runtime";
import { StructuredLogger } from "@/src/lib/logging/structured-logger";
import { safeErrorMessage } from "@/src/lib/security/redact";

/**
 * Distributed rate limiting (diagram card I — "Oran limitleri").
 *
 * A fixed-window counter shared by every instance through a Redis-compatible
 * REST store (Upstash Redis or Vercel KV, both speak the same REST API). When
 * no store is configured the limiter counts in memory per instance, which is
 * only acceptable in development/test or when RATE_LIMIT_BACKEND=memory is set
 * deliberately. If the store is unreachable the limiter degrades to the
 * in-memory counter instead of failing open.
 */

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimitBackend {
  readonly name: string;
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

export class MemoryRateLimitBackend implements RateLimitBackend {
  readonly name = "memory";
  private readonly windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = this.now();
    if (this.windows.size > 10_000) {
      for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
    }
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + windowMs };
      this.windows.set(key, window);
    }
    window.count += 1;
    return { allowed: window.count <= limit, count: window.count, remaining: Math.max(0, limit - window.count), resetAt: window.resetAt };
  }
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface RestRedisOptions {
  url: string;
  token: string;
  prefix?: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
  now?: () => number;
}

/** Upstash Redis / Vercel KV REST pipeline: INCR + PEXPIRE on a per-window key. */
export class RestRedisRateLimitBackend implements RateLimitBackend {
  readonly name = "redis-rest";
  private readonly url: string;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: RestRedisOptions) {
    this.url = options.url.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  }

  async hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = (this.options.now ?? Date.now)();
    const bucket = Math.floor(now / windowMs);
    const redisKey = `${this.options.prefix ?? "mouseai:rl"}:${key}:${bucket}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 500);
    try {
      const response = await this.fetchImpl(`${this.url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["PEXPIRE", redisKey, String(windowMs * 2)],
        ]),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`rate_limit_store_http_${response.status}`);
      const body = (await response.json()) as Array<{ result?: unknown; error?: string }>;
      const count = Number(body?.[0]?.result);
      if (!Number.isFinite(count) || body?.[0]?.error) throw new Error("rate_limit_store_bad_response");
      const resetAt = (bucket + 1) * windowMs;
      return { allowed: count <= limit, count, remaining: Math.max(0, limit - count), resetAt };
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface RateLimiterLike {
  isAllowed(key: string, limit: number): boolean | Promise<boolean>;
}

/** RateLimiter used by the isolation gate; degrades to memory on store errors. */
export class DistributedRateLimiter implements RateLimiterLike {
  private warned = false;

  constructor(
    readonly backend: RateLimitBackend,
    private readonly fallback: RateLimitBackend = new MemoryRateLimitBackend(),
    readonly windowMs = 60_000,
  ) {}

  async check(key: string, limit: number): Promise<RateLimitResult & { backend: string; degraded: boolean }> {
    try {
      const result = await this.backend.hit(key, limit, this.windowMs);
      return { ...result, backend: this.backend.name, degraded: false };
    } catch (error) {
      if (!this.warned) {
        this.warned = true;
        StructuredLogger.warn("rate_limit_store_unavailable", { backend: this.backend.name, reason: safeErrorMessage(error) });
      }
      const result = await this.fallback.hit(key, limit, this.windowMs);
      return { ...result, backend: this.fallback.name, degraded: true };
    }
  }

  async isAllowed(key: string, limit: number): Promise<boolean> {
    return (await this.check(key, limit)).allowed;
  }
}

export function rateLimitStoreConfig(env: Env = process.env): { url: string; token: string; source: string } | null {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN, source: "UPSTASH_REDIS_REST_URL" };
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN, source: "KV_REST_API_URL" };
  return null;
}

export function createRateLimiter(env: Env = process.env, fetchImpl?: FetchLike): DistributedRateLimiter {
  const store = rateLimitStoreConfig(env);
  const windowMs = intSetting(env, "RATE_LIMIT_WINDOW_MS", 60_000, { min: 1_000, max: 3_600_000 });
  if (store && env.RATE_LIMIT_BACKEND !== "memory") {
    return new DistributedRateLimiter(
      new RestRedisRateLimitBackend({ url: store.url, token: store.token, fetchImpl, timeoutMs: intSetting(env, "RATE_LIMIT_TIMEOUT_MS", 500, { min: 50, max: 5_000 }) }),
      new MemoryRateLimitBackend(),
      windowMs,
    );
  }
  return new DistributedRateLimiter(new MemoryRateLimitBackend(), new MemoryRateLimitBackend(), windowMs);
}
