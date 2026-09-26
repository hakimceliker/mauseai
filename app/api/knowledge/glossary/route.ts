import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { GlossaryTermSchema } from "@/src/lib/knowledge/knowledge";

/** D — glossary terms; synonyms expand CORE retrieval queries. */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId }) =>
    json({ terms: must(await client.from("glossary_terms").select("*").eq("tenant_id", tenantId).order("term", { ascending: true }), "glossary_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("knowledge.write", async ({ client, tenantId }) => {
    const body = await parseBody(request, GlossaryTermSchema);
    const row = must(await client.from("glossary_terms").insert({ tenant_id: tenantId, ...body }).select("*").single(), "glossary_create");
    return json({ term: row }, 201);
  });
}
