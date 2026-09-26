import { verifyTeamsRequest } from "@/src/lib/channels/signatures";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { recordTeamToolMessage } from "@/src/server/az/team-inbound";

/**
 * Microsoft Teams outgoing webhook endpoint (C/O). Requests are verified with
 * the HMAC secret Teams issues (TEAMS_OUTGOING_WEBHOOK_SECRET); without it the
 * endpoint answers 503 channel_not_configured. Teams expects a message reply.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const verification = verifyTeamsRequest({ secret: process.env.TEAMS_OUTGOING_WEBHOOK_SECRET, authorization: request.headers.get("authorization"), body });
  if (!verification.ok) {
    const notConfigured = verification.reason === "secret_not_configured";
    return Response.json({ error: notConfigured ? "channel_not_configured" : verification.reason }, { status: notConfigured ? 503 : 401 });
  }
  let payload: { type?: string; text?: string; from?: { aadObjectId?: string; id?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const externalUserId = payload.from?.aadObjectId || payload.from?.id;
  const text = (payload.text ?? "").replace(/<at>.*?<\/at>/g, "").trim();
  if (payload.type !== "message" || !externalUserId || !text) return Response.json({ type: "message", text: "Mesaj alınamadı." });
  try {
    const result = await recordTeamToolMessage(getSupabaseAdminClient(), { channel: "teams", externalUserId, text });
    const reply =
      result.status === "recorded"
        ? "Mesajınız MouseAI bağlamınıza eklendi; yanıtı web veya API kanalında görebilirsiniz."
        : "Bu Teams hesabı bir MouseAI kullanıcısına bağlı değil.";
    return Response.json({ type: "message", text: reply });
  } catch {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
