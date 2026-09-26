import { verifySlackRequest } from "@/src/lib/channels/signatures";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { recordTeamToolMessage } from "@/src/server/az/team-inbound";

/**
 * Slack Events API endpoint (C/O). Every request is signature-verified with
 * SLACK_SIGNING_SECRET (5-minute replay window). Without the secret the
 * endpoint answers 503 channel_not_configured.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const verification = verifySlackRequest({
    secret: process.env.SLACK_SIGNING_SECRET,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
    body,
  });
  if (!verification.ok) {
    const notConfigured = verification.reason === "secret_not_configured";
    return Response.json({ error: notConfigured ? "channel_not_configured" : verification.reason }, { status: notConfigured ? 503 : 401 });
  }
  let payload: { type?: string; challenge?: string; event?: { type?: string; user?: string; text?: string; bot_id?: string; subtype?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  if (payload.type === "url_verification" && typeof payload.challenge === "string") return Response.json({ challenge: payload.challenge });
  const event = payload.event;
  // Bot echoes, edits and non-message events are acknowledged and ignored (Slack retries non-2xx).
  if (payload.type !== "event_callback" || !event || event.bot_id || event.subtype || !event.user || !event.text || !["message", "app_mention"].includes(event.type ?? ""))
    return Response.json({ ok: true, ignored: true });
  try {
    const result = await recordTeamToolMessage(getSupabaseAdminClient(), { channel: "slack", externalUserId: event.user, text: event.text });
    return Response.json({ ok: true, status: result.status });
  } catch {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
