/**
 * Secret redaction for logs, audit payloads and error messages.
 *
 * Two layers: the values of known secret environment variables are replaced
 * wherever they appear, and common credential shapes (API keys, bearer
 * tokens, webhook URLs with embedded tokens) are masked even when the value
 * is not in the environment.
 */

import type { Env } from "@/src/lib/config/runtime";

export const SECRET_ENV_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "INNGEST_SIGNING_KEY",
  "INNGEST_EVENT_KEY",
  "INGEST_WEBHOOK_SECRET",
  "EMAIL_PROVIDER_KEY",
  "SLACK_WEBHOOK_URL",
  "SLACK_SIGNING_SECRET",
  "TEAMS_WEBHOOK_URL",
  "TEAMS_OUTGOING_WEBHOOK_SECRET",
  "CRM_API_KEY",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_TOKEN",
  "PAYMENT_API_KEY",
  "PAYMENT_WEBHOOK_SECRET",
] as const;

const PATTERNS: RegExp[] = [
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}/g, // OpenAI / Anthropic style keys
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\bre_[A-Za-z0-9_]{16,}/g, // Resend keys
  /\bpat-[a-z0-9]{2,}-[A-Za-z0-9-]{16,}/g, // HubSpot private app tokens
  /(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi,
  /(https:\/\/hooks\.slack\.com\/services\/)[A-Za-z0-9/]+/g,
  /(https:\/\/[a-z0-9.-]*webhook\.office\.com\/)[^\s"']+/gi,
  /(https:\/\/[a-z0-9.-]*\.logic\.azure\.com[^\s"']*sig=)[^\s"'&]+/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
];

const MASK = "[REDACTED]";

export function redactText(text: string, env: Env = process.env): string {
  let out = text;
  for (const key of SECRET_ENV_KEYS) {
    const value = env[key];
    if (value && value.length >= 8) out = out.split(value).join(MASK);
  }
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, (_match, prefix?: string) => (typeof prefix === "string" ? `${prefix}${MASK}` : MASK));
  }
  return out;
}

const SECRET_KEY_NAME = /(api[_-]?key|secret|token|password|authorization|signature|webhook[_-]?url)/i;

/** Deep-redacts a JSON-like value: secret-looking keys are masked, strings are pattern-scrubbed. */
export function redact<T>(value: T, env: Env = process.env, depth = 0): T {
  if (depth > 8) return value;
  if (typeof value === "string") return redactText(value, env) as T;
  if (Array.isArray(value)) return value.map((v) => redact(v, env, depth + 1)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_NAME.test(k) && v !== null && v !== undefined && typeof v !== "boolean" ? MASK : redact(v, env, depth + 1);
    }
    return out as T;
  }
  return value;
}

/** Safe, bounded error description for logs and API bodies. */
export function safeErrorMessage(error: unknown, env: Env = process.env, max = 300): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
  return redactText(raw, env).slice(0, max);
}
