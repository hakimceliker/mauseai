import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Inbound webhook verification for team tools.
 *
 * Slack: `X-Slack-Signature: v0=<hex HMAC-SHA256(secret, "v0:<ts>:<body>")>` with
 * `X-Slack-Request-Timestamp` inside a 5-minute window (replay protection).
 * Teams outgoing webhook: `Authorization: HMAC <base64 HMAC-SHA256(base64-decoded secret, body)>`.
 */

export type VerifyResult = { ok: true } | { ok: false; reason: "secret_not_configured" | "missing_signature" | "stale_timestamp" | "invalid_signature" };

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const SLACK_MAX_SKEW_SECONDS = 300;

export function slackSignature(secret: string, timestamp: string, body: string): string {
  return `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;
}

export function verifySlackRequest(input: {
  secret: string | undefined;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds?: number;
}): VerifyResult {
  if (!input.secret) return { ok: false, reason: "secret_not_configured" };
  if (!input.timestamp || !input.signature) return { ok: false, reason: "missing_signature" };
  const ts = Number(input.timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > SLACK_MAX_SKEW_SECONDS) return { ok: false, reason: "stale_timestamp" };
  return safeEqual(slackSignature(input.secret, input.timestamp, input.body), input.signature) ? { ok: true } : { ok: false, reason: "invalid_signature" };
}

export function teamsSignature(secretBase64: string, body: string): string {
  return `HMAC ${createHmac("sha256", Buffer.from(secretBase64, "base64")).update(body, "utf8").digest("base64")}`;
}

export function verifyTeamsRequest(input: { secret: string | undefined; authorization: string | null; body: string }): VerifyResult {
  if (!input.secret) return { ok: false, reason: "secret_not_configured" };
  if (!input.authorization?.startsWith("HMAC ")) return { ok: false, reason: "missing_signature" };
  return safeEqual(teamsSignature(input.secret, input.body), input.authorization) ? { ok: true } : { ok: false, reason: "invalid_signature" };
}
