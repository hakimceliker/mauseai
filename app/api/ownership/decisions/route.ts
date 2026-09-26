import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { DecisionRecordSchema } from "@/src/lib/ownership/ownership";

/** T — decision records. */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId }) =>
    json({ decisions: must(await client.from("decision_records").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "decisions_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("ownership.manage", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, DecisionRecordSchema);
    const row = must(await client.from("decision_records").insert({ tenant_id: tenantId, ...body, supersedes: body.supersedes ?? null, created_by: userId }).select("*").single(), "decision_create");
    if (body.supersedes)
      await client.from("decision_records").update({ status: "superseded" }).eq("id", body.supersedes).eq("tenant_id", tenantId);
    return json({ decision: row }, 201);
  });
}
