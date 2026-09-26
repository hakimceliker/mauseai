import { z } from "zod";
import { HttpError, json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { startRun } from "@/src/server/az/flow-service";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/** M — start a flow run (Idempotency-Key supported); execution happens in Inngest. */
export async function GET() {
  return withTenant("flow.run", async ({ client, tenantId }) =>
    json({ runs: must(await client.from("flow_runs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100), "runs_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("flow.run", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, z.object({ templateKey: z.string().min(3).max(60), goal: z.string().min(5).max(4_000) }));
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (idempotencyKey && idempotencyKey.length > 200) throw new HttpError(400, "invalid_idempotency_key");
    const result = await startRun(client, { tenantId, userId, templateKey: body.templateKey, goal: body.goal, idempotencyKey });
    if (!result.duplicate) await inngest.send({ name: AZ_EVENTS.flowRun, data: { tenantId, runId: result.run.id } });
    return json(result, result.duplicate ? 200 : 202);
  });
}
