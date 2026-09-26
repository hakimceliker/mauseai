import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { decideApproval } from "@/src/server/az/flow-service";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { audit } from "@/src/server/az/records";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/** N — approve or reject; an approved flow run resumes in Inngest. Requesters cannot approve their own request. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTenant("approval.decide", async ({ client, tenantId, userId }) => {
    const { id } = await params;
    const body = await parseBody(request, z.object({ decision: z.enum(["approved", "rejected"]) }));
    const result = await decideApproval(client, { tenantId, approvalId: id, userId, decision: body.decision });
    if (result.resumeRunId) await inngest.send({ name: AZ_EVENTS.flowRun, data: { tenantId, runId: result.resumeRunId } });
    await audit(getSupabaseAdminClient(), { tenantId, actorType: "user", actorId: userId, action: `approval.${body.decision}`, resourceType: "approval", resourceId: id });
    return json(result);
  });
}
