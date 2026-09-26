import { describe, expect, it } from "vitest";
import { createSender, senderStatus, type OutboundMessage } from "@/src/lib/notifications/senders";
import {
  bypassesQuietHours,
  inQuietHours,
  localHour,
  nextAttemptAt,
  planDeliveries,
  type NotificationRoute,
  type RoutableNotification,
} from "@/src/lib/notifications/routing";
import { slackSignature, teamsSignature, verifySlackRequest, verifyTeamsRequest } from "@/src/lib/channels/signatures";
import { HttpCallError, resilientFetch } from "@/src/lib/http/resilient-fetch";
import { redact, redactText, safeErrorMessage } from "@/src/lib/security/redact";

const noSleep = async () => {};

function recorder(responses: Array<() => Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return next();
  };
  return { calls, fetchImpl };
}

const message: OutboundMessage = {
  destination: "ops@example.com",
  kind: "alert",
  priority: "urgent",
  title: "Maliyet eşiği aşıldı",
  body: "Günlük bütçenin %95'i kullanıldı.",
  link: "https://app.example/ops",
};

const EMAIL_ENV = { EMAIL_PROVIDER_KEY: "re_test_key_value_123456", EMAIL_FROM: "MouseAI <noreply@example.com>" };
const SLACK_ENV = { SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/T000/B000/XXXX" };
const TEAMS_ENV = { TEAMS_WEBHOOK_URL: "https://example.webhook.office.com/webhookb2/abc" };

describe("senders", () => {
  it("reports missing env names (never values) per channel", () => {
    expect(senderStatus("email", {})).toEqual({ configured: false, missingEnv: ["EMAIL_PROVIDER_KEY", "EMAIL_FROM"] });
    expect(senderStatus("slack", SLACK_ENV)).toEqual({ configured: true, missingEnv: [] });
    expect(() => createSender("teams", {})).toThrow("channel_not_configured:teams");
  });

  it("email: posts to Resend with a bearer key and a priority subject", async () => {
    const http = recorder([() => new Response(JSON.stringify({ id: "msg_1" }), { status: 200 })]);
    const send = createSender("email", EMAIL_ENV, { fetchImpl: http.fetchImpl, sleep: noSleep });
    expect(await send(message)).toEqual({ providerMessageId: "msg_1" });
    expect(http.calls[0].url).toBe("https://api.resend.com/emails");
    expect((http.calls[0].init.headers as Record<string, string>).Authorization).toBe(`Bearer ${EMAIL_ENV.EMAIL_PROVIDER_KEY}`);
    const body = JSON.parse(String(http.calls[0].init.body));
    expect(body).toMatchObject({ from: EMAIL_ENV.EMAIL_FROM, to: ["ops@example.com"], subject: "[Acil] Maliyet eşiği aşıldı" });
    expect(body.text).toContain("https://app.example/ops");
  });

  it("email: rejects an invalid destination before any network call", async () => {
    const http = recorder([() => new Response("{}", { status: 200 })]);
    const send = createSender("email", EMAIL_ENV, { fetchImpl: http.fetchImpl, sleep: noSleep });
    await expect(send({ ...message, destination: "not-an-email" })).rejects.toThrow();
    expect(http.calls).toHaveLength(0);
  });

  it("slack: sends blocks to the webhook", async () => {
    const http = recorder([() => new Response("ok", { status: 200 })]);
    await createSender("slack", SLACK_ENV, { fetchImpl: http.fetchImpl, sleep: noSleep })(message);
    const body = JSON.parse(String(http.calls[0].init.body));
    expect(http.calls[0].url).toBe(SLACK_ENV.SLACK_WEBHOOK_URL);
    expect(body.blocks[0]).toMatchObject({ type: "header" });
    expect(body.text).toBe("[Acil] Maliyet eşiği aşıldı");
  });

  it("teams: sends an Adaptive Card 1.4", async () => {
    const http = recorder([() => new Response("1", { status: 200 })]);
    await createSender("teams", TEAMS_ENV, { fetchImpl: http.fetchImpl, sleep: noSleep })(message);
    const body = JSON.parse(String(http.calls[0].init.body));
    expect(body.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(body.attachments[0].content).toMatchObject({ type: "AdaptiveCard", version: "1.4" });
  });

  it("retries 5xx then succeeds; does not retry 400", async () => {
    const flaky = recorder([() => new Response("down", { status: 502 }), () => new Response("ok", { status: 200 })]);
    await createSender("slack", SLACK_ENV, { fetchImpl: flaky.fetchImpl, sleep: noSleep })(message);
    expect(flaky.calls).toHaveLength(2);

    const bad = recorder([() => new Response("bad", { status: 400 })]);
    const error = await createSender("slack", SLACK_ENV, { fetchImpl: bad.fetchImpl, sleep: noSleep })(message).catch((e) => e);
    expect(error).toBeInstanceOf(HttpCallError);
    expect(error).toMatchObject({ code: "http_error", status: 400, retryable: false, attempts: 1 });
    // The webhook URL (a secret) never appears in the error.
    expect(String(error.message)).not.toContain("hooks.slack.com");
  });
});

describe("resilientFetch", () => {
  it("times out each attempt and reports timeout after the retries", async () => {
    const hang = async (_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    const error = await resilientFetch("https://x.example", { method: "POST" }, { fetchImpl: hang, timeoutMs: 5, retries: 1, sleep: noSleep }).catch((e) => e);
    expect(error).toMatchObject({ code: "timeout", attempts: 2 });
  });

  it("honours Retry-After on 429", async () => {
    const waits: number[] = [];
    const http = recorder([() => new Response("", { status: 429, headers: { "retry-after": "2" } }), () => new Response("ok")]);
    await resilientFetch("https://x.example", {}, { fetchImpl: http.fetchImpl, sleep: async (ms) => void waits.push(ms) });
    expect(waits).toEqual([2000]);
  });
});

const baseRoute: NotificationRoute = {
  id: "r1",
  tenant_id: "t1",
  team: "engineering",
  channel: "slack",
  destination: "#ops",
  min_priority: "normal",
  quiet_start_hour: 22,
  quiet_end_hour: 8,
  timezone: "Europe/Istanbul",
  active: true,
};

const baseNotification: RoutableNotification = { id: "n1", tenant_id: "t1", kind: "task", priority: "normal", recipient_teams: ["engineering"] };

// 2026-09-26T20:30Z = 23:30 in Istanbul (UTC+3) → inside quiet hours.
const NIGHT = new Date("2026-09-26T20:30:00Z");
// 2026-09-26T09:00Z = 12:00 in Istanbul → working hours.
const NOON = new Date("2026-09-26T09:00:00Z");

describe("routing: right person, right time", () => {
  it("computes the local hour in the route's time zone", () => {
    expect(localHour(NIGHT, "Europe/Istanbul")).toBe(23);
    expect(localHour(NIGHT, "Not/AZone")).toBe(20);
    expect(inQuietHours(23, 22, 8)).toBe(true);
    expect(inQuietHours(12, 22, 8)).toBe(false);
    expect(inQuietHours(3, null, null)).toBe(false);
  });

  it("sends immediately during working hours", () => {
    const [plan] = planDeliveries(baseNotification, [baseRoute], NOON, SLACK_ENV);
    expect(plan).toMatchObject({ status: "pending", not_before: NOON.toISOString(), channel: "slack", destination: "#ops" });
  });

  it("defers non-urgent messages until 08:00 local time", () => {
    const [plan] = planDeliveries(baseNotification, [baseRoute], NIGHT, SLACK_ENV);
    expect(plan.status).toBe("deferred");
    expect(plan.not_before).toBe("2026-09-27T05:00:00.000Z"); // 08:00 Istanbul
  });

  it("urgent and high-priority alerts bypass quiet hours", () => {
    expect(bypassesQuietHours("task", "urgent")).toBe(true);
    expect(bypassesQuietHours("alert", "high")).toBe(true);
    expect(bypassesQuietHours("task", "high")).toBe(false);
    const [plan] = planDeliveries({ ...baseNotification, kind: "alert", priority: "high" }, [baseRoute], NIGHT, SLACK_ENV);
    expect(plan.status).toBe("pending");
  });

  it("filters by team, priority, activity and tenant", () => {
    const routes: NotificationRoute[] = [
      { ...baseRoute, id: "other-team", team: "legal" },
      { ...baseRoute, id: "too-high", min_priority: "high", destination: "#high" },
      { ...baseRoute, id: "inactive", active: false, destination: "#off" },
      { ...baseRoute, id: "foreign", tenant_id: "t2", destination: "#foreign" },
    ];
    expect(planDeliveries(baseNotification, routes, NOON, SLACK_ENV)).toEqual([]);
  });

  it("dedupes the same destination reached through two teams", () => {
    const routes = [baseRoute, { ...baseRoute, id: "r2", team: "product" as const, destination: "#OPS" }];
    const plans = planDeliveries({ ...baseNotification, recipient_teams: ["engineering", "product"] }, routes, NOON, SLACK_ENV);
    expect(plans).toHaveLength(1);
  });

  it("marks unconfigured channels channel_not_configured instead of sending", () => {
    const [plan] = planDeliveries(baseNotification, [{ ...baseRoute, channel: "teams" }], NOON, SLACK_ENV);
    expect(plan.status).toBe("channel_not_configured");
  });

  it("backs off exponentially", () => {
    expect(nextAttemptAt(1, NOON).getTime() - NOON.getTime()).toBe(60_000);
    expect(nextAttemptAt(4, NOON).getTime() - NOON.getTime()).toBe(8 * 60_000);
  });
});

describe("inbound signature verification", () => {
  const secret = "slack-signing-secret-for-tests";
  const body = JSON.stringify({ type: "event_callback" });
  const ts = "1790000000";

  it("accepts a valid Slack signature inside the window", () => {
    expect(verifySlackRequest({ secret, timestamp: ts, signature: slackSignature(secret, ts, body), body, nowSeconds: 1790000100 })).toEqual({ ok: true });
  });

  it("rejects tampered, stale, missing and unconfigured Slack requests", () => {
    const signature = slackSignature(secret, ts, body);
    expect(verifySlackRequest({ secret, timestamp: ts, signature, body: body + " ", nowSeconds: 1790000000 })).toEqual({ ok: false, reason: "invalid_signature" });
    expect(verifySlackRequest({ secret, timestamp: ts, signature, body, nowSeconds: 1790000301 })).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(verifySlackRequest({ secret, timestamp: null, signature, body })).toEqual({ ok: false, reason: "missing_signature" });
    expect(verifySlackRequest({ secret: undefined, timestamp: ts, signature, body })).toEqual({ ok: false, reason: "secret_not_configured" });
  });

  it("verifies Teams outgoing webhook HMAC", () => {
    const teamsSecret = Buffer.from("teams-secret-bytes").toString("base64");
    const auth = teamsSignature(teamsSecret, body);
    expect(verifyTeamsRequest({ secret: teamsSecret, authorization: auth, body })).toEqual({ ok: true });
    expect(verifyTeamsRequest({ secret: teamsSecret, authorization: auth, body: "{}" })).toEqual({ ok: false, reason: "invalid_signature" });
    expect(verifyTeamsRequest({ secret: teamsSecret, authorization: "Bearer x", body })).toEqual({ ok: false, reason: "missing_signature" });
    expect(verifyTeamsRequest({ secret: undefined, authorization: auth, body })).toEqual({ ok: false, reason: "secret_not_configured" });
  });
});

describe("secret redaction", () => {
  it("masks configured secret values and credential shapes", () => {
    // Built at runtime so no credential-shaped literal lands in the repository (push protection).
    const env = { CRM_API_KEY: ["pat", "na1", "fake0000-fake-fake-fake-fake00000000"].join("-"), OPENAI_API_KEY: ["sk", "proj", "fakefakefakefakefake"].join("-") };
    const text = `failed with ${env.CRM_API_KEY} and ${env.OPENAI_API_KEY} via https://hooks.slack.com/services/T0/B0/zzz`;
    const out = redactText(text, env);
    expect(out).not.toContain(env.CRM_API_KEY);
    expect(out).not.toContain(env.OPENAI_API_KEY);
    expect(out).not.toContain("T0/B0/zzz");
    expect(safeErrorMessage(new Error(`Bearer abcdefghijklmnop123`), {})).toBe("Bearer [REDACTED]");
  });

  it("deep-redacts secret-named keys", () => {
    expect(redact({ apiKey: "x", nested: { webhook_url: "y", ok: true, note: "fine" } }, {})).toEqual({
      apiKey: "[REDACTED]",
      nested: { webhook_url: "[REDACTED]", ok: true, note: "fine" },
    });
  });
});
