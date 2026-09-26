import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { decideDeletion } from "@/src/server/az/pipeline-service";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/** U — owner decision; approval triggers anonymisation in Inngest. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTenant("compliance.decide", async ({ client, tenantId, userId }) => {
    const { id } = await params;
    const body = await parseBody(request, z.object({ decision: z.enum(["approved", "rejected"]) }));
    const updated = await decideDeletion(client, { tenantId, requestId: id, decidedBy: userId, decision: body.decision });
    await client.from("approvals").update({ status: body.decision, decided_by: userId, decided_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("resource_type", "deletion_request").eq("resource_id", id).eq("status", "pending");
    if (updated.status === "approved") await inngest.send({ name: AZ_EVENTS.deletionApproved, data: { tenantId, requestId: id } });
    return json({ request: updated });
  });
}
