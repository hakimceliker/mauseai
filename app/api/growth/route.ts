import { json, must, withTenant } from "@/src/server/http/tenant-route";
import { retention } from "@/src/server/az/ops-service";

/** V–Z — versions in rollout, templates available to replicate, retention cohorts, learning queue size. */
export async function GET() {
  return withTenant("ops.read", async ({ client, tenantId }) => {
    const [rollouts, templates, learned, cohorts] = await Promise.all([
      client.from("rollouts").select("feature_key,version,stage").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
      client.from("flow_templates").select("key,version,cloned_from").eq("tenant_id", tenantId).limit(200),
      client.from("eval_cases").select("id").eq("tenant_id", tenantId).eq("origin", "feedback").limit(10_000),
      retention(client, tenantId),
    ]);
    return json({
      versions: must(rollouts, "rollouts_load"),
      templates: must(templates, "templates_load"),
      learnedCases: (must(learned, "cases_load") as unknown[]).length,
      retention: cohorts,
    });
  });
}
