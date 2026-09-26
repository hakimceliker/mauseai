import { json, withTenant } from "@/src/server/http/tenant-route";
import { KPI_CATALOG } from "@/src/lib/kpi/kpi";
import { kpiValues } from "@/src/server/az/ops-service";

/** E — KPI values computed from recorded tasks, feedback and flow runs. */
export async function GET() {
  return withTenant("blueprint.read", async ({ client, tenantId }) => {
    const values = await kpiValues(client, tenantId);
    return json({ kpis: values.map((v) => ({ ...KPI_CATALOG.find((k) => k.key === v.key), ...v })) });
  });
}
