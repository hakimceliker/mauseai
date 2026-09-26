import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { FeedbackInputSchema } from "@/src/lib/feedback/feedback";
import { submitFeedback } from "@/src/server/az/pipeline-service";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/** F — feedback → label → improvement queue. */
export async function GET(request: Request) {
  return withTenant("feedback.read", async ({ client, tenantId }) => {
    const status = new URL(request.url).searchParams.get("queue") ?? "new";
    return json({
      feedback: must(
        await client.from("feedback").select("*").eq("tenant_id", tenantId).eq("queue_status", status).order("created_at", { ascending: false }).limit(200),
        "feedback_load",
      ),
    });
  });
}

export async function POST(request: Request) {
  return withTenant("feedback.write", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, FeedbackInputSchema);
    const feedback = await submitFeedback(client, { tenantId, userId, feedback: body });
    await inngest.send({ name: AZ_EVENTS.feedbackSubmitted, data: { tenantId, feedbackId: feedback.id } });
    return json({ feedback }, 201);
  });
}
