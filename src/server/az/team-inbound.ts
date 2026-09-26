import { classifyText } from "@/src/lib/compliance/compliance";
import type { Db } from "./records";

/**
 * Verified inbound messages from team tools (Slack events, Teams outgoing
 * webhooks). The tenant and user come only from a linked channel identity —
 * never from the payload — and an identity linked in more than one tenant is
 * refused rather than guessed. The message joins the user's single context
 * (card O); the answer is produced by CORE on the next web/API turn.
 */
export type TeamInboundResult =
  | { status: "recorded"; tenantId: string; userId: string; contextKey: string }
  | { status: "identity_not_linked" }
  | { status: "identity_ambiguous" };

export async function recordTeamToolMessage(
  admin: Db,
  input: { channel: "slack" | "teams"; externalUserId: string; text: string },
): Promise<TeamInboundResult> {
  const identities = await admin
    .from("channel_identities")
    .select("tenant_id,user_id")
    .eq("channel", input.channel)
    .eq("external_user_id", input.externalUserId)
    .limit(2);
  if (identities.error) throw new Error("identity_lookup_failed");
  const rows = (identities.data ?? []) as Array<{ tenant_id: string; user_id: string }>;
  if (!rows.length) return { status: "identity_not_linked" };
  if (rows.length > 1) return { status: "identity_ambiguous" };
  const { tenant_id: tenantId, user_id: userId } = rows[0];
  const contextKey = `${tenantId}:${userId}`;
  const text = input.text.slice(0, 20_000);
  const inserted = await admin.from("channel_messages").insert({
    tenant_id: tenantId,
    user_id: userId,
    channel: input.channel,
    context_key: contextKey,
    direction: "inbound",
    text,
    data_class: classifyText(text, "personal"),
  });
  if (inserted.error) throw new Error("channel_message_record_failed");
  return { status: "recorded", tenantId, userId, contextKey };
}
