import { z } from "zod";

/**
 * Channels and omnichannel identity (diagram cards C — "Channels" and
 * O — "Omnichannel": tek kimlik, tek bağlam).
 *
 * A channel is only "available" when the code path to use it exists and needs
 * no external credential. Channels that need a provider account report
 * "requires_credentials" together with the environment variables to set;
 * they are never reported as working without them.
 */

export type ChannelId = "web" | "api" | "mobile" | "email" | "slack" | "teams" | "crm";

export interface ChannelDefinition {
  id: ChannelId;
  label: string;
  direction: Array<"inbound" | "outbound">;
  requiredEnv: string[];
  /** Planned channels have no client in this repo yet (e.g. the mobile app). */
  planned?: boolean;
}

export const CHANNELS: ChannelDefinition[] = [
  { id: "web", label: "Web uygulaması", direction: ["inbound", "outbound"], requiredEnv: [] },
  { id: "api", label: "REST API", direction: ["inbound", "outbound"], requiredEnv: [] },
  { id: "mobile", label: "Mobil uygulama", direction: ["inbound", "outbound"], requiredEnv: [], planned: true },
  { id: "email", label: "E-posta", direction: ["outbound"], requiredEnv: ["EMAIL_PROVIDER_KEY", "EMAIL_FROM"] },
  { id: "slack", label: "Slack", direction: ["inbound", "outbound"], requiredEnv: ["SLACK_WEBHOOK_URL", "SLACK_SIGNING_SECRET"] },
  { id: "teams", label: "Microsoft Teams", direction: ["inbound", "outbound"], requiredEnv: ["TEAMS_WEBHOOK_URL"] },
  { id: "crm", label: "CRM", direction: ["inbound", "outbound"], requiredEnv: ["CRM_API_KEY"] },
];

export type ChannelStatus = "available" | "requires_credentials" | "planned";

export function channelStatus(channel: ChannelDefinition, env: Record<string, string | undefined> = process.env): {
  status: ChannelStatus;
  missingEnv: string[];
} {
  if (channel.planned) return { status: "planned", missingEnv: [] };
  const missingEnv = channel.requiredEnv.filter((key) => !env[key]);
  return { status: missingEnv.length ? "requires_credentials" : "available", missingEnv };
}

export function listChannels(env: Record<string, string | undefined> = process.env) {
  return CHANNELS.map((c) => ({ ...c, ...channelStatus(c, env) }));
}

export function isChannelAvailable(id: string, env: Record<string, string | undefined> = process.env): boolean {
  const channel = CHANNELS.find((c) => c.id === id);
  return !!channel && channelStatus(channel, env).status === "available";
}

/** Inbound payload shape each channel adapter must produce. */
export const InboundMessageSchema = z.object({
  channel: z.enum(["web", "api", "mobile", "email", "slack", "teams", "crm"]),
  externalUserId: z.string().min(1).max(255),
  externalThreadId: z.string().min(1).max(255).optional(),
  text: z.string().min(1).max(20_000),
  receivedAt: z.string().datetime().optional(),
});

export type InboundMessage = z.infer<typeof InboundMessageSchema>;

export interface ChannelIdentity {
  tenantId: string;
  userId: string;
  channel: ChannelId;
  externalUserId: string;
}

export interface ResolvedInbound {
  tenantId: string;
  userId: string;
  /** Same conversation key regardless of channel, so context follows the user. */
  contextKey: string;
  channel: ChannelId;
  text: string;
}

export function resolveIdentity(
  message: InboundMessage,
  tenantId: string,
  identities: ChannelIdentity[],
): ResolvedInbound | null {
  const match = identities.find(
    (i) => i.tenantId === tenantId && i.channel === message.channel && i.externalUserId === message.externalUserId,
  );
  if (!match) return null;
  return {
    tenantId,
    userId: match.userId,
    contextKey: `${tenantId}:${match.userId}`,
    channel: message.channel,
    text: message.text,
  };
}
