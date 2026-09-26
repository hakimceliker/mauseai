import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { IngestPayloadSchema, verifyWebhook, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMESTAMP_HEADER } from "@/src/lib/ingestion/ingestion";
import { receiveDocument } from "@/src/server/az/pipeline-service";
import { ServiceError } from "@/src/server/az/records";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/**
 * G — signed webhook ingestion. Refused unless INGEST_WEBHOOK_SECRET is set;
 * the tenant comes from the registered source, never from the request.
 */
export async function POST(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const body = await request.text();
  const verification = verifyWebhook({
    secret: process.env.INGEST_WEBHOOK_SECRET,
    signature: request.headers.get(WEBHOOK_SIGNATURE_HEADER),
    timestamp: request.headers.get(WEBHOOK_TIMESTAMP_HEADER),
    body,
  });
  if (!verification.ok)
    return Response.json({ error: verification.reason }, { status: verification.reason === "secret_not_configured" ? 503 : 401 });
  try {
    const { sourceId } = await params;
    const admin = getSupabaseAdminClient();
    const source = await admin.from("ingestion_sources").select("id,tenant_id,kind").eq("id", sourceId).maybeSingle();
    if (!source.data || source.data.kind !== "webhook") return Response.json({ error: "source_not_found" }, { status: 404 });
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = IngestPayloadSchema.safeParse({ ...(raw as object), sourceId });
    if (!parsed.success) return Response.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
    const result = await receiveDocument(admin, { tenantId: source.data.tenant_id, createdBy: null, payload: parsed.data });
    if (!result.duplicate) await inngest.send({ name: AZ_EVENTS.documentReceived, data: { tenantId: source.data.tenant_id, documentId: result.document.id } });
    return Response.json(result, { status: result.duplicate ? 200 : 202 });
  } catch (error) {
    if (error instanceof ServiceError) return Response.json({ error: error.code }, { status: error.status });
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
