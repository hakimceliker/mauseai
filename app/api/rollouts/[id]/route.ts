import { z } from "zod";
import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { advanceRollout, type RolloutStage } from "@/src/lib/rollout/rollout";
import { gateEvidence } from "@/src/server/az/ops-service";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { audit, notify } from "@/src/server/az/records";

/** P → V–Z — advance through the quality/security/SRE gates, or roll back. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withTenant("rollout.manage", async ({ client, tenantId, userId }) => {
    const { id } = await params;
    const body = await parseBody(request, z.object({ action: z.enum(["advance", "rollback"]) }));
    const rollout = must(await client.from("rollouts").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(), "rollout") as {
      stage: RolloutStage;
      feature_key: string;
      version: string;
      gate_history: unknown[];
    };
    let stage: RolloutStage = "rolled_back";
    let failures: string[] = [];
    const evidence = body.action === "advance" ? await gateEvidence(client, tenantId) : null;
    if (evidence) {
      const result = advanceRollout(rollout.stage, evidence);
      if (!result.ok) failures = result.failures;
      else stage = result.stage;
    }
    const history = [...(rollout.gate_history ?? []), { at: new Date().toISOString(), action: body.action, by: userId, evidence, failures }];
    if (failures.length) {
      await client.from("rollouts").update({ gate_history: history }).eq("id", id).eq("tenant_id", tenantId);
      return json({ error: "gate_failed", failures, evidence }, 409);
    }
    const updated = must(
      await client.from("rollouts").update({ stage, gate_history: history, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantId).select("*").single(),
      "rollout_update",
    );
    await audit(getSupabaseAdminClient(), { tenantId, actorType: "user", actorId: userId, action: `rollout.${stage}`, resourceType: "rollout", resourceId: id, payload: { version: rollout.version } });
    if (stage === "rolled_back")
      await notify(client, { tenantId, kind: "alert", area: "rollout", priority: "high", title: `Geri alındı: ${rollout.feature_key}`, body: `Sürüm ${rollout.version} geri alındı.` });
    return json({ rollout: updated });
  });
}
