import { json, withTenant } from "@/src/server/http/tenant-route";
import { quickstartChecklist } from "@/src/lib/ux/experience";

/** K — quick-start checklist from the tenant's real progress. */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId }) => {
    const has = async (table: string) => ((await client.from(table).select("id").eq("tenant_id", tenantId).limit(1)).data ?? []).length > 0;
    const [hasBlueprint, hasKnowledgeSource, hasDocument, hasAskedQuestion, hasFlowRun] = await Promise.all([
      has("blueprints"),
      has("knowledge_sources"),
      has("documents"),
      has("model_calls"),
      has("flow_runs"),
    ]);
    return json(quickstartChecklist({ hasBlueprint, hasKnowledgeSource, hasDocument, hasAskedQuestion, hasFlowRun }));
  });
}
