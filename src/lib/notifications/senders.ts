import { z } from "zod";
import type { Env } from "@/src/lib/config/runtime";
import { resilientFetch, type ResilientOptions } from "@/src/lib/http/resilient-fetch";
import type { NotificationKind, Priority } from "./notifications";

/**
 * External notification senders (card N → channels C/O).
 *
 * - E-posta: Resend HTTP API (EMAIL_PROVIDER_KEY, EMAIL_FROM).
 * - Slack: incoming webhook (SLACK_WEBHOOK_URL).
 * - Teams: incoming webhook / Workflows URL with an Adaptive Card (TEAMS_WEBHOOK_URL).
 *
 * A sender that is not configured is never called: callers get
 * `channel_not_configured` from `senderStatus` first.
 */

export type ExternalChannel = "email" | "slack" | "teams";

export interface OutboundMessage {
  destination: string;
  kind: NotificationKind;
  priority: Priority;
  title: string;
  body: string;
  link?: string | null;
}

export const SENDER_ENV: Record<ExternalChannel, string[]> = {
  email: ["EMAIL_PROVIDER_KEY", "EMAIL_FROM"],
  slack: ["SLACK_WEBHOOK_URL"],
  teams: ["TEAMS_WEBHOOK_URL"],
};

export function senderStatus(channel: ExternalChannel, env: Env = process.env): { configured: boolean; missingEnv: string[] } {
  const missingEnv = SENDER_ENV[channel].filter((key) => !env[key]);
  return { configured: missingEnv.length === 0, missingEnv };
}

const EmailSchema = z.string().email().max(320);
const PRIORITY_LABEL: Record<Priority, string> = { low: "Düşük", normal: "Normal", high: "Yüksek", urgent: "Acil" };

function subject(message: OutboundMessage): string {
  const prefix = message.priority === "urgent" || message.priority === "high" ? `[${PRIORITY_LABEL[message.priority]}] ` : "";
  return `${prefix}${message.title}`.slice(0, 200);
}

export type Sender = (message: OutboundMessage) => Promise<{ providerMessageId: string | null }>;

export function createSender(channel: ExternalChannel, env: Env = process.env, http: ResilientOptions = {}): Sender {
  const status = senderStatus(channel, env);
  if (!status.configured) throw new Error(`channel_not_configured:${channel}`);
  const options: ResilientOptions = { timeoutMs: 10_000, retries: 2, ...http };

  if (channel === "email") {
    return async (message) => {
      const to = EmailSchema.parse(message.destination);
      const response = await resilientFetch(
        env.EMAIL_API_URL || "https://api.resend.com/emails",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${env.EMAIL_PROVIDER_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [to],
            subject: subject(message),
            text: `${message.body}${message.link ? `\n\n${message.link}` : ""}`,
          }),
        },
        options,
      );
      const data = (await response.json().catch(() => ({}))) as { id?: string };
      return { providerMessageId: data.id ?? null };
    };
  }

  if (channel === "slack") {
    return async (message) => {
      await resilientFetch(
        env.SLACK_WEBHOOK_URL!,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: subject(message),
            blocks: [
              { type: "header", text: { type: "plain_text", text: subject(message).slice(0, 150) } },
              { type: "section", text: { type: "mrkdwn", text: message.body.slice(0, 2900) } },
              {
                type: "context",
                elements: [{ type: "mrkdwn", text: `${message.kind} · ${PRIORITY_LABEL[message.priority]} · ${message.destination}` }],
              },
            ],
          }),
        },
        options,
      );
      return { providerMessageId: null };
    };
  }

  return async (message) => {
    await resilientFetch(
      env.TEAMS_WEBHOOK_URL!,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "message",
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
                type: "AdaptiveCard",
                version: "1.4",
                body: [
                  { type: "TextBlock", text: subject(message), weight: "Bolder", size: "Medium", wrap: true },
                  { type: "TextBlock", text: message.body.slice(0, 4000), wrap: true },
                  { type: "TextBlock", text: `${message.kind} · ${PRIORITY_LABEL[message.priority]}`, isSubtle: true, size: "Small" },
                ],
              },
            },
          ],
        }),
      },
      options,
    );
    return { providerMessageId: null };
  };
}
