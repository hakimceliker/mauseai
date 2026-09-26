import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { RolloutSchema } from "@/src/lib/rollout/rollout";

/** P — pilot → production rollouts (owner, rollback plan and runbook are mandatory). */
export async function GET() {
  return withTenant("ops.read", async ({ client, tenantId }) =>
    json({ rollouts: must(await client.from("rollouts").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "rollouts_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("rollout.manage", async ({ client, tenantId }) => {
    const body = await parseBody(request, RolloutSchema);
    const row = must(
      await client
        .from("rollouts")
        .insert({ tenant_id: tenantId, feature_key: body.featureKey, version: body.version, owner: body.owner, rollback_plan: body.rollbackPlan, runbook_url: body.runbookUrl, allowlist: body.allowlist })
        .select("*")
        .single(),
      "rollout_create",
    );
    return json({ rollout: row }, 201);
  });
}
