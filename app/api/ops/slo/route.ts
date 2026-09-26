import { json, withTenant } from "@/src/server/http/tenant-route";
import { gateReport, sloStatus } from "@/src/server/az/ops-service";

/** S — SLO, alarms, budget and capacity from the last 24h of model calls, plus P gate status. */
export async function GET() {
  return withTenant("ops.read", async ({ client, tenantId }) => json({ ...(await sloStatus(client, tenantId)), gates: await gateReport(client, tenantId) }));
}
