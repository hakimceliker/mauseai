import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { IngestPayloadSchema } from "@/src/lib/ingestion/ingestion";
import { receiveDocument } from "@/src/server/az/pipeline-service";
import { inngest } from "@/src/inngest/client";
import { AZ_EVENTS } from "@/src/inngest/functions/a-z-pipelines";

/** G → H — authenticated document upload; preparation runs in Inngest. Idempotent per content. */
export async function POST(request: Request) {
  return withTenant("ingest.write", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, IngestPayloadSchema.extend({ visibility: z.enum(["personal", "team"]).default("team") }));
    const { visibility, ...payload } = body;
    const result = await receiveDocument(client, { tenantId, createdBy: userId, payload, visibility });
    if (!result.duplicate) await inngest.send({ name: AZ_EVENTS.documentReceived, data: { tenantId, documentId: result.document.id } });
    return json(result, result.duplicate ? 200 : 202);
  });
}
