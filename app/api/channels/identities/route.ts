import { z } from "zod";
import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
/** O — link an external channel account to the caller (one identity across channels). */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId, userId }) =>
    json({ identities: must(await client.from("channel_identities").select("*").eq("tenant_id", tenantId).eq("user_id", userId), "identities_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("core.ask", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, z.object({ channel: z.enum(["web", "api", "mobile", "email", "slack", "teams", "crm"]), externalUserId: z.string().min(1).max(255) }));
    const row = must(
      await client.from("channel_identities").insert({ tenant_id: tenantId, user_id: userId, channel: body.channel, external_user_id: body.externalUserId }).select("*").single(),
      "identity_create",
    );
    return json({ identity: row }, 201);
  });
}
