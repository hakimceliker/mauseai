import { json, withTenant } from "@/src/server/http/tenant-route";
import { configReport } from "@/src/lib/config/production-checks";

/** Production configuration report for admins: env var names and ok/missing flags only, never values. */
export async function GET() {
  return withTenant("config.read", async () => json(configReport()));
}
