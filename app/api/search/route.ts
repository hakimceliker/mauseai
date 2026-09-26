import { json, HttpError, withTenant } from "@/src/server/http/tenant-route";
import { rankChunks } from "@/src/lib/core/retrieval";
import { expandQuery } from "@/src/lib/knowledge/knowledge";
import { loadGlossary, loadVisibleChunks } from "@/src/server/az/core-service";

/** K — search across the caller's personal and team knowledge. */
export async function GET(request: Request) {
  return withTenant("knowledge.read", async ({ client, tenantId, userId }) => {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 500) throw new HttpError(400, "invalid_query");
    const [chunks, glossary] = await Promise.all([loadVisibleChunks(client, tenantId, userId), loadGlossary(client, tenantId)]);
    const results = rankChunks(expandQuery(q, glossary), chunks, { tenantId, topK: 10 }).map((c) => ({
      chunkId: c.id,
      documentId: c.documentId,
      score: Number(c.score.toFixed(4)),
      excerpt: c.content.slice(0, 300),
    }));
    return json({ query: q, results });
  });
}
