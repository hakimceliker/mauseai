import { z } from "zod";
import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { runEvaluation } from "@/src/server/az/ops-service";
import { assignVariant, compareProportions } from "@/src/lib/eval/eval";

/** Q — run the golden set through CORE, compare with the previous run (regression). */
export async function GET() {
  return withTenant("eval.run", async ({ client, tenantId }) =>
    json({ runs: must(await client.from("eval_runs").select("id,label,total,passed,accuracy,p95_latency_ms,usefulness,regression,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50), "runs_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("eval.run", async ({ client, tenantId, userId, role }) => {
    const body = await parseBody(
      request,
      z.object({
        label: z.string().min(1).max(100),
        abTest: z.object({ control: z.object({ successes: z.number().int().min(0), trials: z.number().int().min(0) }), treatment: z.object({ successes: z.number().int().min(0), trials: z.number().int().min(0) }) }).optional(),
      }),
    );
    const result = await runEvaluation(client, { tenantId, userId, role, label: body.label });
    return json({ ...result, abTest: body.abTest ? compareProportions(body.abTest.control, body.abTest.treatment) : null, yourVariant: assignVariant(body.label, userId) }, 201);
  });
}
