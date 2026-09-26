import { z } from "zod";
import { json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { freshness, KnowledgeSourceSchema } from "@/src/lib/knowledge/knowledge";

/** D — domain knowledge sources with owner and freshness. */
export async function GET() {
  return withTenant("knowledge.read", async ({ client, tenantId }) => {
    const rows = must(await client.from("knowledge_sources").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(500), "knowledge_load") as Array<{
      review_interval_days: number;
      last_reviewed_at: string | null;
    }>;
    return json({ sources: rows.map((r) => ({ ...r, freshness: freshness({ reviewIntervalDays: r.review_interval_days, lastReviewedAt: r.last_reviewed_at }) })) });
  });
}

export async function POST(request: Request) {
  return withTenant("knowledge.write", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, KnowledgeSourceSchema.extend({ visibility: z.enum(["personal", "team"]).default("team") }));
    const row = must(
      await client
        .from("knowledge_sources")
        .insert({
          tenant_id: tenantId,
          name: body.name,
          kind: body.kind,
          owner: body.owner,
          review_interval_days: body.reviewIntervalDays,
          last_reviewed_at: body.lastReviewedAt ?? null,
          description: body.description ?? null,
          visibility: body.visibility,
          created_by: userId,
        })
        .select("*")
        .single(),
      "knowledge_create",
    );
    return json({ source: row }, 201);
  });
}
