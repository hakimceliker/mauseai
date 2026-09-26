import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { GoldenCaseSchema } from "@/src/lib/eval/eval";

/** Q — golden dataset. */
export async function GET() {
  return withTenant("eval.run", async ({ client, tenantId }) =>
    json({ cases: must(await client.from("eval_cases").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "cases_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("eval.run", async ({ client, tenantId }) => {
    const body = await parseBody(request, GoldenCaseSchema);
    const row = must(await client.from("eval_cases").insert({ tenant_id: tenantId, key: body.key, input: body.input, expected: body.expected }).select("*").single(), "case_create");
    return json({ case: row }, 201);
  });
}
