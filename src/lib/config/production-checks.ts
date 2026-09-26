import { runtimeMode, type Env } from "./runtime";
import { openaiPrice } from "@/src/lib/ai/providers/pricing";
import { rateLimitStoreConfig } from "@/src/lib/ratelimit/distributed";
import { senderStatus } from "@/src/lib/notifications/senders";
import { crmStatus } from "@/src/lib/crm/crm-adapter";

/**
 * Production configuration report. Lists which settings are present by env
 * var NAME only — values are never read into the report, logged or returned.
 *
 * critical    → production must not serve traffic without it
 * recommended → works, but degraded (e.g. estimated prices)
 * optional    → a channel/integration that stays `channel_not_configured`
 */

export type CheckLevel = "critical" | "recommended" | "optional";

export interface ConfigCheck {
  id: string;
  level: CheckLevel;
  ok: boolean;
  missing: string[];
  note: string;
}

export interface ConfigReport {
  mode: ReturnType<typeof runtimeMode>;
  ready: boolean;
  checks: ConfigCheck[];
}

const missingOf = (env: Env, keys: string[]) => keys.filter((k) => !env[k]);

function allOf(env: Env, id: string, level: CheckLevel, keys: string[], note: string): ConfigCheck {
  const missing = missingOf(env, keys);
  return { id, level, ok: missing.length === 0, missing, note };
}

const PUBLIC_ALLOWED = new Set(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_ANALYTICS_KEY", "NEXT_PUBLIC_APP_URL"]);

export function configReport(env: Env = process.env): ConfigReport {
  const mode = runtimeMode(env);
  const checks: ConfigCheck[] = [];

  checks.push(allOf(env, "supabase", "critical", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "Auth, RLS ve arka plan işleri için gerekli."));
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && !/^https:\/\//.test(url)) checks.push({ id: "supabase_url_https", level: "critical", ok: false, missing: [], note: "NEXT_PUBLIC_SUPABASE_URL https olmalı." });
  checks.push(allOf(env, "inngest", "critical", ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"], "Arka plan akışları ve imzalı Inngest çağrıları için gerekli."));

  const aiKeys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"].filter((k) => env[k]);
  checks.push({
    id: "ai_provider",
    level: "critical",
    ok: aiKeys.length > 0,
    missing: aiKeys.length ? [] : ["OPENAI_API_KEY | ANTHROPIC_API_KEY"],
    note: "Production'da mock sağlayıcı kullanılmaz; en az bir gerçek sağlayıcı anahtarı gerekir.",
  });
  if (env.OPENAI_API_KEY && openaiPrice(env).estimated)
    checks.push({ id: "openai_pricing", level: "recommended", ok: false, missing: ["OPENAI_PRICE_INPUT_CENTS_PER_1M", "OPENAI_PRICE_OUTPUT_CENTS_PER_1M"], note: "Maliyet tahmini varsayılan fiyatlarla yapılıyor." });

  const store = rateLimitStoreConfig(env);
  const memoryAck = env.RATE_LIMIT_BACKEND === "memory";
  checks.push({
    id: "rate_limit_store",
    level: memoryAck ? "recommended" : "critical",
    ok: !!store && !memoryAck,
    missing: store ? [] : ["UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN | KV_REST_API_URL + KV_REST_API_TOKEN"],
    note: memoryAck ? "RATE_LIMIT_BACKEND=memory: limitler instance başına sayılır." : "Dağıtık oran limiti için Redis/KV gerekir.",
  });

  const leaked = Object.keys(env).filter((k) => k.startsWith("NEXT_PUBLIC_") && !PUBLIC_ALLOWED.has(k) && /(SECRET|SERVICE_ROLE|PRIVATE|TOKEN|API_KEY)/.test(k));
  checks.push({ id: "no_public_secrets", level: "critical", ok: leaked.length === 0, missing: leaked, note: "NEXT_PUBLIC_ ile başlayan değişkenler tarayıcıya gömülür; sır içermemeli." });

  for (const channel of ["email", "slack", "teams"] as const) {
    const status = senderStatus(channel, env);
    checks.push({ id: `channel_${channel}_outbound`, level: "optional", ok: status.configured, missing: status.missingEnv, note: "Eksikse teslimatlar channel_not_configured olarak kaydedilir." });
  }
  checks.push(allOf(env, "channel_slack_inbound", "optional", ["SLACK_SIGNING_SECRET"], "Slack Events uç noktası imza doğrulaması."));
  checks.push(allOf(env, "channel_teams_inbound", "optional", ["TEAMS_OUTGOING_WEBHOOK_SECRET"], "Teams outgoing webhook HMAC doğrulaması."));
  const crm = crmStatus(env);
  checks.push({ id: "crm", level: "optional", ok: crm.configured, missing: crm.missingEnv, note: "Eksikse CRM uç noktası 503 crm_not_configured döner." });
  checks.push(allOf(env, "ingest_webhook", "optional", ["INGEST_WEBHOOK_SECRET"], "İmzalı veri alım webhook'u."));

  const ready = checks.every((c) => c.ok || c.level !== "critical");
  return { mode, ready, checks };
}

/** Names of failing critical checks — safe to log. */
export function criticalFailures(report: ConfigReport): string[] {
  return report.checks.filter((c) => c.level === "critical" && !c.ok).map((c) => `${c.id}${c.missing.length ? `(${c.missing.join(", ")})` : ""}`);
}
