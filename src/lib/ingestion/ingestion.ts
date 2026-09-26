import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Data ingestion (diagram card G): dosya, API, webhook, doküman, olay akışı —
 * every payload carries its schema version and the owning source.
 */

export const INGESTION_KINDS = ["file", "api", "webhook", "document", "event_stream"] as const;

export const IngestionSourceSchema = z.object({
  name: z.string().min(2).max(200),
  kind: z.enum(INGESTION_KINDS),
  owner: z.string().min(2).max(200),
  schemaVersion: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
});

export const SUPPORTED_CONTENT_TYPES = ["text/plain", "text/markdown", "text/html", "application/json"] as const;

export const IngestPayloadSchema = z.object({
  sourceId: z.string().uuid(),
  schemaVersion: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  externalId: z.string().min(1).max(255),
  title: z.string().min(1).max(500),
  contentType: z.enum(SUPPORTED_CONTENT_TYPES),
  content: z.string().min(1).max(500_000),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;

/** Converts supported payload types to text for preparation; JSON is flattened to "path: value" lines. */
export function payloadToText(payload: Pick<IngestPayload, "contentType" | "content">): string {
  if (payload.contentType !== "application/json") return payload.content;
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.content);
  } catch {
    throw new Error("invalid_json_content");
  }
  const lines: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) walk(child, path ? `${path}.${key}` : key);
    } else if (value !== null && value !== undefined) {
      lines.push(`${path}: ${String(value)}`);
    }
  };
  walk(parsed, "");
  return lines.join("\n");
}

/**
 * Schema-version compatibility: same major version is accepted, a newer
 * minor from the sender is accepted, a different major is rejected.
 */
export function isSchemaCompatible(sourceVersion: string, payloadVersion: string): boolean {
  const [sMajor, sMinor] = sourceVersion.split(".").map(Number);
  const [pMajor, pMinor] = payloadVersion.split(".").map(Number);
  return sMajor === pMajor && pMinor >= sMinor;
}

export const WEBHOOK_SIGNATURE_HEADER = "x-masuai-signature";
export const WEBHOOK_TIMESTAMP_HEADER = "x-masuai-timestamp";
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export function signWebhook(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export type WebhookVerification = { ok: true } | { ok: false; reason: "secret_not_configured" | "missing_headers" | "stale_timestamp" | "bad_signature" };

/** HMAC-SHA256 over "timestamp.body" with replay protection; no secret configured means webhooks are refused. */
export function verifyWebhook(input: {
  secret: string | undefined;
  signature: string | null;
  timestamp: string | null;
  body: string;
  nowSeconds?: number;
}): WebhookVerification {
  if (!input.secret) return { ok: false, reason: "secret_not_configured" };
  if (!input.signature || !input.timestamp) return { ok: false, reason: "missing_headers" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: "stale_timestamp" };
  const expected = Buffer.from(signWebhook(input.secret, input.timestamp, input.body));
  const actual = Buffer.from(input.signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return { ok: false, reason: "bad_signature" };
  return { ok: true };
}
