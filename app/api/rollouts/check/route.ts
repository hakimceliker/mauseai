import { json, HttpError, must, withTenant } from "@/src/server/http/tenant-route";
import { isEnabledFor, type RolloutStage } from "@/src/lib/rollout/rollout";

/** P — is a feature enabled for a subject (deterministic cohort)? */
export async function GET(request: Request) {
  return withTenant("core.ask", async ({ client, tenantId, userId }) => {
    const url = new URL(request.url);
    const feature = url.searchParams.get("feature");
    if (!feature) throw new HttpError(400, "feature_required");
    const rows = must(
      await client.from("rollouts").select("feature_key,stage,allowlist,version").eq("tenant_id", tenantId).eq("feature_key", feature).order("created_at", { ascending: false }).limit(1),
      "rollout_load",
    ) as Array<{ feature_key: string; stage: RolloutStage; allowlist: string[]; version: string }>;
    if (!rows.length) return json({ feature, enabled: false, reason: "no_rollout" });
    const r = rows[0];
    return json({ feature, version: r.version, stage: r.stage, enabled: isEnabledFor({ featureKey: r.feature_key, stage: r.stage, allowlist: r.allowlist }, userId) });
  });
}
