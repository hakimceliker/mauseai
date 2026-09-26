import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  DistributedRateLimiter,
  MemoryRateLimitBackend,
  rateLimitStoreConfig,
  RestRedisRateLimitBackend,
} from "@/src/lib/ratelimit/distributed";
import { evaluateGuard, TENANT_REQUESTS_PER_MINUTE } from "@/src/lib/isolation/guard";

/** A fake Upstash/KV REST endpoint: one shared counter map, like a real Redis. */
function fakeRedis() {
  const store = new Map<string, number>();
  const calls: Array<{ url: string; auth: string; body: unknown }> = [];
  const fetchImpl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
    const commands = JSON.parse(init.body) as string[][];
    calls.push({ url, auth: init.headers.Authorization, body: commands });
    const results = commands.map(([cmd, key]) => {
      if (cmd === "INCR") {
        const next = (store.get(key) ?? 0) + 1;
        store.set(key, next);
        return { result: next };
      }
      return { result: 1 };
    });
    return { ok: true, status: 200, json: async () => results };
  };
  return { store, calls, fetchImpl };
}

describe("MemoryRateLimitBackend", () => {
  it("counts within a window and resets after it", async () => {
    let now = 1_000;
    const backend = new MemoryRateLimitBackend(() => now);
    expect((await backend.hit("k", 2, 1_000)).allowed).toBe(true);
    expect((await backend.hit("k", 2, 1_000)).allowed).toBe(true);
    const third = await backend.hit("k", 2, 1_000);
    expect(third).toMatchObject({ allowed: false, count: 3, remaining: 0 });
    now += 1_000;
    expect((await backend.hit("k", 2, 1_000)).count).toBe(1);
  });

  it("keeps keys independent", async () => {
    const backend = new MemoryRateLimitBackend(() => 0);
    await backend.hit("a", 1, 1_000);
    expect((await backend.hit("a", 1, 1_000)).allowed).toBe(false);
    expect((await backend.hit("b", 1, 1_000)).allowed).toBe(true);
  });
});

describe("RestRedisRateLimitBackend", () => {
  it("shares one counter across limiter instances (distributed)", async () => {
    const redis = fakeRedis();
    const now = () => 120_000;
    const a = new DistributedRateLimiter(new RestRedisRateLimitBackend({ url: "https://kv.example/", token: "tok", fetchImpl: redis.fetchImpl, now }));
    const b = new DistributedRateLimiter(new RestRedisRateLimitBackend({ url: "https://kv.example/", token: "tok", fetchImpl: redis.fetchImpl, now }));
    expect(await a.isAllowed("tenant:t1", 2)).toBe(true);
    expect(await b.isAllowed("tenant:t1", 2)).toBe(true);
    const third = await a.check("tenant:t1", 2);
    expect(third).toMatchObject({ allowed: false, count: 3, backend: "redis-rest", degraded: false });
    expect(redis.calls[0].url).toBe("https://kv.example/pipeline");
    expect(redis.calls[0].auth).toBe("Bearer tok");
    expect(redis.calls[0].body).toEqual([
      ["INCR", "mouseai:rl:tenant:t1:2"],
      ["PEXPIRE", "mouseai:rl:tenant:t1:2", "120000"],
    ]);
  });

  it("degrades to the in-memory counter when the store fails, never failing open", async () => {
    const failing = new RestRedisRateLimitBackend({
      url: "https://kv.example",
      token: "tok",
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }),
    });
    const limiter = new DistributedRateLimiter(failing, new MemoryRateLimitBackend(() => 0));
    const first = await limiter.check("k", 1);
    expect(first).toMatchObject({ allowed: true, degraded: true, backend: "memory" });
    expect((await limiter.check("k", 1)).allowed).toBe(false);
  });

  it("treats a malformed store response as an error", async () => {
    const bad = new RestRedisRateLimitBackend({
      url: "https://kv.example",
      token: "tok",
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => [{ error: "ERR" }] }),
    });
    await expect(bad.hit("k", 1, 1_000)).rejects.toThrow("rate_limit_store_bad_response");
  });
});

describe("createRateLimiter configuration", () => {
  it("uses the Upstash store when configured", () => {
    const limiter = createRateLimiter({ UPSTASH_REDIS_REST_URL: "https://u.example", UPSTASH_REDIS_REST_TOKEN: "t" });
    expect(limiter.backend.name).toBe("redis-rest");
  });

  it("accepts Vercel KV variables", () => {
    expect(rateLimitStoreConfig({ KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t" })?.source).toBe("KV_REST_API_URL");
  });

  it("falls back to memory without a store or when RATE_LIMIT_BACKEND=memory", () => {
    expect(createRateLimiter({}).backend.name).toBe("memory");
    expect(
      createRateLimiter({ UPSTASH_REDIS_REST_URL: "https://u.example", UPSTASH_REDIS_REST_TOKEN: "t", RATE_LIMIT_BACKEND: "memory" }).backend.name,
    ).toBe("memory");
  });

  it("ignores out-of-range or invalid window settings", () => {
    expect(createRateLimiter({ RATE_LIMIT_WINDOW_MS: "30000" }).windowMs).toBe(30_000);
    expect(createRateLimiter({ RATE_LIMIT_WINDOW_MS: "10" }).windowMs).toBe(60_000);
    expect(createRateLimiter({ RATE_LIMIT_WINDOW_MS: "junk" }).windowMs).toBe(60_000);
  });
});

describe("evaluateGuard with a distributed limiter", () => {
  it("returns 429 once the shared tenant budget is used", async () => {
    const redis = fakeRedis();
    const limiter = new DistributedRateLimiter(
      new RestRedisRateLimitBackend({ url: "https://kv.example", token: "tok", fetchImpl: redis.fetchImpl, now: () => 0 }),
    );
    const ctx = { tenantId: "t1", userId: "u1", role: "member" };
    redis.store.set("mouseai:rl:tenant:t1:0", TENANT_REQUESTS_PER_MINUTE - 1);
    expect(await evaluateGuard(ctx, { permission: "core.ask" }, limiter)).toEqual({ allowed: true });
    expect(await evaluateGuard(ctx, { permission: "core.ask" }, limiter)).toEqual({ allowed: false, reason: "rate_limited", status: 429 });
    // Another tenant is unaffected.
    expect(await evaluateGuard({ ...ctx, tenantId: "t2" }, { permission: "core.ask" }, limiter)).toEqual({ allowed: true });
  });
});
