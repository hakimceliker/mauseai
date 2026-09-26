import { afterEach, describe, expect, it, vi } from "vitest";
import { configReport, criticalFailures } from "@/src/lib/config/production-checks";
import { mocksAllowed, runtimeMode } from "@/src/lib/config/runtime";

const SECRETS = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-value-1234567890",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value-1234567890",
  INNGEST_EVENT_KEY: "inngest-event-value-123",
  INNGEST_SIGNING_KEY: "signkey-prod-value-123",
  ANTHROPIC_API_KEY: "sk-ant-test-value-1234567890",
  UPSTASH_REDIS_REST_URL: "https://redis.example",
  UPSTASH_REDIS_REST_TOKEN: "redis-token-value-123",
};

const check = (report: ReturnType<typeof configReport>, id: string) => report.checks.find((c) => c.id === id)!;

describe("runtime mode", () => {
  it("allows mocks only outside production", () => {
    expect(runtimeMode({ NODE_ENV: "production" })).toBe("production");
    expect(runtimeMode({ NODE_ENV: "production", VITEST: "true" })).toBe("test");
    expect(runtimeMode({})).toBe("development");
    expect(mocksAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(mocksAllowed({ NODE_ENV: "development" })).toBe(true);
  });
});

describe("production config report", () => {
  it("is not ready with an empty environment and names the critical gaps", () => {
    const report = configReport({ NODE_ENV: "production" });
    expect(report.mode).toBe("production");
    expect(report.ready).toBe(false);
    const failures = criticalFailures(report);
    expect(failures.some((f) => f.startsWith("supabase("))).toBe(true);
    expect(failures.some((f) => f.startsWith("inngest("))).toBe(true);
    expect(failures.some((f) => f.startsWith("ai_provider("))).toBe(true);
    expect(failures.some((f) => f.startsWith("rate_limit_store("))).toBe(true);
  });

  it("is ready when every critical setting is present; optional channels stay reported", () => {
    const report = configReport({ NODE_ENV: "production", ...SECRETS });
    expect(report.ready).toBe(true);
    expect(check(report, "crm")).toMatchObject({ ok: false, level: "optional", missing: ["CRM_API_KEY"] });
    expect(check(report, "channel_slack_outbound")).toMatchObject({ ok: false, missing: ["SLACK_WEBHOOK_URL"] });
  });

  it("never includes secret values in the report", () => {
    const serialized = JSON.stringify(configReport({ NODE_ENV: "production", ...SECRETS, CRM_API_KEY: "pat-na1-secret-crm-value" }));
    for (const value of [...Object.values(SECRETS).filter((v) => !v.startsWith("https://")), "pat-na1-secret-crm-value"]) expect(serialized).not.toContain(value);
  });

  it("flags secrets exposed through NEXT_PUBLIC_ variables", () => {
    const report = configReport({ ...SECRETS, NEXT_PUBLIC_OPENAI_API_KEY: "x", NEXT_PUBLIC_APP_URL: "https://app.example" });
    expect(check(report, "no_public_secrets")).toMatchObject({ ok: false, missing: ["NEXT_PUBLIC_OPENAI_API_KEY"] });
    expect(report.ready).toBe(false);
  });

  it("requires https for the Supabase URL", () => {
    const report = configReport({ ...SECRETS, NEXT_PUBLIC_SUPABASE_URL: "http://abc.supabase.co" });
    expect(check(report, "supabase_url_https").ok).toBe(false);
    expect(report.ready).toBe(false);
  });

  it("downgrades an acknowledged in-memory rate limiter to recommended", () => {
    const { UPSTASH_REDIS_REST_URL: _u, UPSTASH_REDIS_REST_TOKEN: _t, ...rest } = SECRETS;
    const report = configReport({ ...rest, RATE_LIMIT_BACKEND: "memory" });
    expect(check(report, "rate_limit_store")).toMatchObject({ level: "recommended", ok: false });
    expect(report.ready).toBe(true);
  });

  it("recommends explicit OpenAI prices when only estimates are available", () => {
    expect(check(configReport({ ...SECRETS, OPENAI_API_KEY: "sk-x" }), "openai_pricing")).toMatchObject({ level: "recommended", ok: false });
    expect(
      configReport({ ...SECRETS, OPENAI_API_KEY: "sk-x", OPENAI_PRICE_INPUT_CENTS_PER_1M: "15", OPENAI_PRICE_OUTPUT_CENTS_PER_1M: "60" }).checks.some(
        (c) => c.id === "openai_pricing",
      ),
    ).toBe(false);
  });
});

describe("instrumentation register()", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs failing check names in production without any secret value", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-should-not-appear");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((line: unknown) => void lines.push(String(line)));
    const { register } = await import("@/instrumentation");
    await register();
    const output = lines.join("\n");
    expect(output).toContain("production_config_incomplete");
    expect(output).toContain("ai_provider");
    expect(output).not.toContain("service-role-should-not-appear");
  });

  it("does nothing outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { register } = await import("@/instrumentation");
    await register();
    expect(spy).not.toHaveBeenCalled();
  });
});
