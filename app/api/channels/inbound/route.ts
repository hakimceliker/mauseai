import { z } from "zod";
import { json, must, parseBody, HttpError, withTenant } from "@/src/server/http/tenant-route";
import { InboundMessageSchema, isChannelAvailable, resolveIdentity, type ChannelIdentity } from "@/src/lib/channels/channels";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ask } from "@/src/server/az/core-service";

/**
 * C → O → CORE: a message received on any configured channel is resolved to
 * the linked user, joins that user's single context and is answered by CORE.
 */
export async function POST(request: Request) {
  return withTenant("core.ask", async ({ client, tenantId, role }) => {
    const body = await parseBody(request, InboundMessageSchema.extend({ riskLevel: z.enum(["L1", "L2", "L3", "L4"]).default("L2") }));
    if (!isChannelAvailable(body.channel)) throw new HttpError(503, "channel_not_configured");
    const identities = must(
      await client.from("channel_identities").select("tenant_id,user_id,channel,external_user_id").eq("tenant_id", tenantId).eq("channel", body.channel).eq("external_user_id", body.externalUserId),
      "identities_load",
    ) as Array<{ tenant_id: string; user_id: string; channel: ChannelIdentity["channel"]; external_user_id: string }>;
    const resolved = resolveIdentity(
      body,
      tenantId,
      identities.map((i) => ({ tenantId: i.tenant_id, userId: i.user_id, channel: i.channel, externalUserId: i.external_user_id })),
    );
    if (!resolved) throw new HttpError(404, "identity_not_linked");
    const result = await ask(client, getSupabaseAdminClient(), { tenantId, userId: resolved.userId, role, question: resolved.text, riskLevel: body.riskLevel, channel: resolved.channel });
    return json({ contextKey: resolved.contextKey, ...result });
  });
}
