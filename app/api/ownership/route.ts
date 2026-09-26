import { json, withTenant } from "@/src/server/http/tenant-route";
import { RACI, accountableTeam, validateRaci, type Area } from "@/src/lib/ownership/ownership";

/** T — RACI matrix per area. */
export async function GET() {
  return withTenant("knowledge.read", async () =>
    json({ raci: RACI, accountable: Object.fromEntries((Object.keys(RACI) as Area[]).map((a) => [a, accountableTeam(a)])), errors: validateRaci() }),
  );
}
