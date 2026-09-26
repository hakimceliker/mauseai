import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { anonymizationPlan, DeletionRequestSchema } from "@/src/lib/compliance/compliance";
import { requestApproval } from "@/src/server/az/records";

/** U — KVKK erasure requests; executed only after an owner approves. */
export async function GET() {
  return withTenant("compliance.request", async ({ client, tenantId }) =>
    json({ requests: must(await client.from("deletion_requests").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "requests_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("compliance.request", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, DeletionRequestSchema);
    const row = must(
      await client
        .from("deletion_requests")
        .insert({ tenant_id: tenantId, subject_user_id: body.subjectUserId, reason: body.reason, scope: body.scope, plan: anonymizationPlan(body.scope), requested_by: userId })
        .select("*")
        .single(),
      "deletion_request_create",
    ) as { id: string };
    await requestApproval(client, { tenantId, resourceType: "deletion_request", resourceId: row.id, area: "compliance", priority: "high", reason: "KVKK silme talebi onay bekliyor", requestedBy: userId });
    return json({ request: row }, 201);
  });
}
