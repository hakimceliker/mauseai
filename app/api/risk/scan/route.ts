import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { draftIncident, scanDataLeak, scanPromptInjection, shouldBlock } from "@/src/lib/risk/risk-scanner";
import { openIncident } from "@/src/server/az/records";

/** R — scan text for prompt injection and data leakage; high findings open an incident. */
export async function POST(request: Request) {
  return withTenant("risk.scan", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, z.object({ text: z.string().min(1).max(50_000), openIncident: z.boolean().default(false) }));
    const findings = [...scanPromptInjection(body.text), ...scanDataLeak(body.text)];
    const incident = draftIncident(findings);
    const incidentId = body.openIncident && incident ? (await openIncident(client, { tenantId, incident, source: "risk.scan", createdBy: userId })).id : null;
    return json({ findings, block: shouldBlock(findings), incident, incidentId });
  });
}
