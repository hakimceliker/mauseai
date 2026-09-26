import { json, withTenant } from "@/src/server/http/tenant-route";
import { DATA_INVENTORY, RETENTION_DAYS } from "@/src/lib/compliance/compliance";

/** U — data classes, retention and the content inventory. */
export async function GET() {
  return withTenant("knowledge.read", async () => json({ retentionDays: RETENTION_DAYS, inventory: DATA_INVENTORY }));
}
