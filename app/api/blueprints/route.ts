import { z } from "zod";
import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { newBlueprint } from "@/src/lib/blueprint/blueprint";

/** Lane 1 (A–F): use-case blueprints. */
export async function GET() {
  return withTenant("blueprint.read", async ({ client, tenantId }) =>
    json({ blueprints: must(await client.from("blueprints").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100), "blueprints_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("blueprint.write", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, z.object({ name: z.string().min(3).max(200) }));
    const bp = newBlueprint(body.name);
    const row = must(
      await client.from("blueprints").insert({ tenant_id: tenantId, name: bp.name, current_stage: bp.currentStage, stages: bp.stages, created_by: userId }).select("*").single(),
      "blueprint_create",
    );
    return json({ blueprint: row }, 201);
  });
}
