import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { IngestionSourceSchema } from "@/src/lib/ingestion/ingestion";

/** G — registered ingestion sources (kind, owner, schema version). */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId }) =>
    json({ sources: must(await client.from("ingestion_sources").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "sources_load") }),
  );
}

export async function POST(request: Request) {
  return withTenant("ingest.write", async ({ client, tenantId }) => {
    const body = await parseBody(request, IngestionSourceSchema);
    const row = must(
      await client.from("ingestion_sources").insert({ tenant_id: tenantId, name: body.name, kind: body.kind, owner: body.owner, schema_version: body.schemaVersion }).select("*").single(),
      "source_create",
    );
    return json({ source: row }, 201);
  });
}
