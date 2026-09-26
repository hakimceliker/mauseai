import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { AIRouter } from "@/src/lib/ai/ai-router";
import { buildProviders, realProviders } from "@/src/lib/ai/provider-registry";
import { AnthropicProvider, toAnthropicMessages } from "@/src/lib/ai/providers/anthropic";
import { OpenAIProvider } from "@/src/lib/ai/providers/openai";
import { anthropicPrice, costCents, openaiPrice } from "@/src/lib/ai/providers/pricing";
import { ProviderError, toProviderError } from "@/src/lib/ai/providers/provider-error";
import { routeTaskAI } from "@/src/lib/ai/task-ai";
import { ConfigurationError } from "@/src/lib/config/runtime";
import { CircuitBreaker, callWithFallback, decideRoute, type RoutedProvider } from "@/src/lib/core/model-routing";
import { runCore } from "@/src/lib/core/orchestrator";

/**
 * Real provider adapters. The SDK clients are real; only the network is
 * replaced (a fetch stub), so request shape, retries and error mapping are the
 * SDKs' own behaviour. No real API key is used anywhere.
 */

const PROD = { NODE_ENV: "production" };
const DEV = { NODE_ENV: "development" };
const FAKE_KEY = "sk-ant-test-0000000000000000000000";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function anthropicMessage(text: string, extra: Record<string, unknown> = {}) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 40 },
    ...extra,
  };
}

describe("Anthropic adapter (official SDK)", () => {
  it("sends system + turns, the refusal fallback beta, and reports real usage", async () => {
    const calls: Array<{ url: string; headers: Headers; body: Record<string, unknown> }> = [];
    const client = new Anthropic({
      apiKey: FAKE_KEY,
      maxRetries: 0,
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), headers: new Headers(init.headers), body: JSON.parse(String(init.body)) });
        return jsonResponse(200, anthropicMessage("İade süresi 14 gündür [1]."));
      }) as unknown as typeof fetch,
    });
    const provider = new AnthropicProvider({ apiKey: FAKE_KEY, client });
    const res = await provider.call([
      { role: "system", content: "Kaynak göster." },
      { role: "user", content: "İade süresi?" },
    ]);
    expect(res).toMatchObject({ provider: "anthropic", content: "İade süresi 14 gündür [1].", usage: { inputTokens: 120, outputTokens: 40 }, tokens_used: 160 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/v1/messages");
    expect(calls[0].headers.get("x-api-key")).toBe(FAKE_KEY);
    expect(calls[0].headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(calls[0].body).toMatchObject({ model: "claude-opus-5", system: "Kaynak göster.", fallbacks: "default", messages: [{ role: "user", content: "İade süresi?" }] });
  });

  it("retries a 529 overload through the SDK and then succeeds", async () => {
    let n = 0;
    const client = new Anthropic({
      apiKey: FAKE_KEY,
      maxRetries: 1,
      fetch: (async () => (++n === 1 ? jsonResponse(529, { type: "error", error: { type: "overloaded_error", message: "busy" } }, { "retry-after-ms": "1" }) : jsonResponse(200, anthropicMessage("tamam")))) as unknown as typeof fetch,
    });
    const res = await new AnthropicProvider({ apiKey: FAKE_KEY, client }).call([{ role: "user", content: "x" }]);
    expect(res.content).toBe("tamam");
    expect(n).toBe(2);
  });

  it("maps auth failures, refusals and empty answers to ProviderError without leaking the key", async () => {
    const unauthorized = new Anthropic({
      apiKey: FAKE_KEY,
      maxRetries: 0,
      fetch: (async () => jsonResponse(401, { type: "error", error: { type: "authentication_error", message: `invalid x-api-key ${FAKE_KEY}` } })) as unknown as typeof fetch,
    });
    const err = await new AnthropicProvider({ apiKey: FAKE_KEY, client: unauthorized }).call([{ role: "user", content: "x" }]).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toMatchObject({ code: "auth_failed", retryable: false, status: 401 });
    expect(String(err.message)).not.toContain(FAKE_KEY);

    const refusing = { beta: { messages: { create: async () => anthropicMessage("", { content: [], stop_reason: "refusal", stop_details: { type: "refusal", category: "cyber", explanation: null } }) } } };
    await expect(new AnthropicProvider({ apiKey: FAKE_KEY, client: refusing as never }).call([{ role: "user", content: "x" }])).rejects.toMatchObject({ code: "refused" });

    const empty = { beta: { messages: { create: async () => anthropicMessage("  ") } } };
    await expect(new AnthropicProvider({ apiKey: FAKE_KEY, client: empty as never }).call([{ role: "user", content: "x" }])).rejects.toMatchObject({ code: "empty_response", retryable: true });
  });

  it("times out through the SDK and reports a retryable timeout", async () => {
    const client = new Anthropic({
      apiKey: FAKE_KEY,
      maxRetries: 0,
      timeout: 20,
      fetch: ((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch,
    });
    await expect(new AnthropicProvider({ apiKey: FAKE_KEY, client }).call([{ role: "user", content: "x" }])).rejects.toMatchObject({ code: "timeout", retryable: true });
  });

  it("rejects conversations that do not start with a user turn", () => {
    expect(() => toAnthropicMessages([{ role: "assistant", content: "hi" }])).toThrow(ProviderError);
    expect(toAnthropicMessages([{ role: "user", content: "a" }, { role: "assistant", content: "" }]).messages).toHaveLength(1);
  });
});

describe("OpenAI adapter (official SDK)", () => {
  it("calls chat completions with the configured model and reports usage", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    const client = new OpenAI({
      apiKey: "sk-test-openai-000000000000",
      maxRetries: 0,
      fetch: (async (_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return jsonResponse(200, {
          id: "c1",
          object: "chat.completion",
          created: 0,
          model: "gpt-test",
          choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "Cevap", refusal: null } }],
          usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
        });
      }) as unknown as typeof fetch,
    });
    const res = await new OpenAIProvider({ apiKey: "x", model: "gpt-test", client }).call([
      { role: "system", content: "s" },
      { role: "user", content: "q" },
    ]);
    expect(res).toMatchObject({ provider: "openai", content: "Cevap", model: "gpt-test", usage: { inputTokens: 50, outputTokens: 10 } });
    expect(bodies[0]).toMatchObject({ model: "gpt-test", messages: [{ role: "system", content: "s" }, { role: "user", content: "q" }] });
  });

  it("maps 429 (after SDK retries) and content filter to ProviderError", async () => {
    let n = 0;
    const limited = new OpenAI({
      apiKey: "x",
      maxRetries: 1,
      fetch: (async () => (n++, jsonResponse(429, { error: { message: "slow down", type: "rate_limit" } }, { "retry-after-ms": "1" }))) as unknown as typeof fetch,
    });
    await expect(new OpenAIProvider({ apiKey: "x", client: limited }).call([{ role: "user", content: "q" }])).rejects.toMatchObject({ code: "rate_limited", retryable: true });
    expect(n).toBe(2);
    const filtered = { chat: { completions: { create: async () => ({ choices: [{ finish_reason: "content_filter", message: { content: null } }] }) } } };
    await expect(new OpenAIProvider({ apiKey: "x", client: filtered as never }).call([{ role: "user", content: "q" }])).rejects.toMatchObject({ code: "refused" });
  });

  it("toProviderError classifies by status and SDK error class", () => {
    expect(toProviderError("p", { status: 503 })).toMatchObject({ code: "unavailable", retryable: true });
    expect(toProviderError("p", { status: 400 })).toMatchObject({ code: "bad_request", retryable: false });
    expect(toProviderError("p", new OpenAI.APIConnectionError({ message: "down" }))).toMatchObject({ code: "unavailable", retryable: true });
  });
});

describe("provider registry and mock policy", () => {
  it("production without any key fails with ai_provider_not_configured (never a mock)", () => {
    expect(() => buildProviders(PROD)).toThrow(ConfigurationError);
    expect(() => buildProviders({ ...PROD, AI_PROVIDER: "mock" })).toThrow("ai_provider_not_configured");
    try {
      buildProviders(PROD);
    } catch (e) {
      expect((e as ConfigurationError).missingEnv).toEqual(["OPENAI_API_KEY", "ANTHROPIC_API_KEY"]);
    }
    expect(() => new AIRouter(PROD)).toThrow("ai_provider_not_configured");
  });

  it("test/development without keys use mocks; keys switch to real adapters with tiers", () => {
    expect(buildProviders(DEV).every((p) => p.mock)).toBe(true);
    const real = buildProviders({ ...PROD, OPENAI_API_KEY: "sk-a", ANTHROPIC_API_KEY: "sk-b", ANTHROPIC_MODEL: "claude-sonnet-5" });
    expect(real.map((p) => [p.provider.name, p.tier, p.mock, p.model])).toEqual([
      ["openai", "standard", false, "gpt-4o-mini"],
      ["anthropic", "careful", false, "claude-sonnet-5"],
    ]);
    // An explicit mock request in development wins over configured keys.
    expect(buildProviders({ ...DEV, AI_PROVIDER: "mock", OPENAI_API_KEY: "sk-a" }).every((p) => p.mock)).toBe(true);
    expect(new AIRouter({ ...PROD, AI_PROVIDER: "claude", ANTHROPIC_API_KEY: "sk-b" }).getProviderName()).toBe("anthropic");
    expect(new AIRouter({ ...DEV, AI_PROVIDER: "gpt" }).getProviderName()).toBe("mock-gpt");
  });

  it("prices: Anthropic list prices, OpenAI from env or flagged estimate", () => {
    expect(anthropicPrice("claude-opus-5")).toMatchObject({ inputCentsPer1M: 500, outputCentsPer1M: 2500, estimated: false });
    expect(openaiPrice({})).toMatchObject({ estimated: true });
    expect(openaiPrice({ OPENAI_PRICE_INPUT_CENTS_PER_1M: "15", OPENAI_PRICE_OUTPUT_CENTS_PER_1M: "60" })).toMatchObject({ inputCentsPer1M: 15, estimated: false });
    expect(costCents(anthropicPrice("claude-opus-5"), { inputTokens: 1_000_000, outputTokens: 100_000 })).toBe(750);
  });

  it("routes high risk to the careful tier and falls back when the primary fails", async () => {
    const answer = (name: string, fail = false): RoutedProvider => ({
      provider: {
        name,
        call: async () => {
          if (fail) throw new ProviderError(name, "unavailable", true, 503);
          return { role: "assistant", content: `from ${name}`, provider: name, usage: { inputTokens: 1000, outputTokens: 1000 } };
        },
      },
      mock: false,
      centsPer1kTokens: 1,
      tier: name === "anthropic" ? "careful" : "standard",
      costFor: () => 7,
    });
    const providers = [answer("openai"), answer("anthropic", true)];
    const route = decideRoute(providers, { riskLevel: "L4", remainingBudgetCents: null, estimatedTokens: 100 });
    expect(route.primary).toBe("anthropic");
    const res = await callWithFallback(providers, route, [{ role: "user", content: "q" }], new CircuitBreaker());
    expect(res).toMatchObject({ provider: "openai", fallbackUsed: true, mock: false });
    expect(res.attempts[0]).toMatchObject({ provider: "anthropic", ok: false, error: "unavailable", retryable: true });
  });

  it("CORE records real usage and exact cost from the provider", async () => {
    const provider: RoutedProvider = {
      provider: { name: "anthropic", call: async () => ({ role: "assistant", content: "İade süresi 14 gündür [1].", provider: "anthropic", model: "claude-opus-5", usage: { inputTokens: 900, outputTokens: 60 } }) },
      mock: false,
      centsPer1kTokens: 15,
      tier: "careful",
      model: "claude-opus-5",
      costFor: (u) => costCents(anthropicPrice("claude-opus-5"), u),
    };
    const result = await runCore(
      {
        ctx: { tenantId: "t1", userId: "u1", role: "member" },
        question: "İade süresi kaç gün?",
        riskLevel: "L1",
        chunks: [{ id: "c1", tenantId: "t1", documentId: "d1", content: "İade süresi teslimattan itibaren 14 gündür.", title: "İade" }] as never,
      },
      { providers: [provider], breaker: new CircuitBreaker(), limiter: { isAllowed: () => true } },
    );
    expect(result.status === "answered" || result.status === "escalated").toBe(true);
    if (result.status === "answered" || result.status === "escalated")
      expect(result.usage).toMatchObject({ provider: "anthropic", model: "claude-opus-5", mock: false, inputTokens: 900, outputTokens: 60, costCents: 1 });
  });

  it("task worker AI: mock only in dev without keys, real providers otherwise", async () => {
    const mock = await routeTaskAI({ taskId: "t", goal: "g", riskLevel: "L1" }, { env: DEV });
    expect(mock.provider).toBe("mock-gpt");
    const real: RoutedProvider[] = realProviders(
      { OPENAI_API_KEY: "x" },
      {
        openai: {
          chat: {
            completions: {
              create: async () =>
                ({ model: "gpt-test", choices: [{ finish_reason: "stop", message: { content: "1. Analiz et\n2. Uygula\nReview: veri kaybı" } }], usage: { prompt_tokens: 30, completion_tokens: 20 } }) as never,
            },
          },
        },
      },
    );
    const res = await routeTaskAI({ taskId: "t", goal: "g", riskLevel: "L1" }, { env: PROD, providers: real });
    expect(res).toMatchObject({ provider: "openai", inputTokens: 30, outputTokens: 20, output: { plan: ["Analiz et", "Uygula"], review: "veri kaybı", mock: false } });
    await expect(routeTaskAI({ taskId: "t", goal: "g", riskLevel: "L1" }, { env: PROD })).rejects.toThrow("ai_provider_not_configured");
  });
});
