import { json, must, HttpError, withTenant } from "@/src/server/http/tenant-route";
import { advanceBlueprint, BLUEPRINT_STAGES, type Blueprint, type BlueprintStage } from "@/src/lib/blueprint/blueprint";

/** Submits one stage (A…F) of a blueprint; stages are validated against the previous ones. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; stage: string }> }) {
  return withTenant("blueprint.write", async ({ client, tenantId }) => {
    const { id, stage } = await params;
    if (!BLUEPRINT_STAGES.includes(stage as BlueprintStage)) throw new HttpError(404, "unknown_stage");
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const row = must(await client.from("blueprints").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(), "blueprint") as {
      name: string;
      stages: Blueprint["stages"];
      current_stage: Blueprint["currentStage"];
    };
    const result = advanceBlueprint({ name: row.name, stages: row.stages ?? {}, currentStage: row.current_stage }, stage as BlueprintStage, input);
    if (!result.ok) return json({ error: "stage_invalid", details: result.errors }, 422);
    const updated = must(
      await client
        .from("blueprints")
        .update({ stages: result.blueprint.stages, current_stage: result.blueprint.currentStage, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single(),
      "blueprint_update",
    );
    return json({ blueprint: updated });
  });
}
