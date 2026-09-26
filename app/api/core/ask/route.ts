import { z } from "zod";
import { json, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ask } from "@/src/server/az/core-service";

/** CORE → I → J → K: ask a question grounded in the tenant's knowledge; returns an explainable result. */
export async function POST(request: Request) {
  return withTenant("core.ask", async ({ client, tenantId, userId, role }) => {
    const body = await parseBody(
      request,
      z.object({ question: z.string().min(2).max(4_000), riskLevel: z.enum(["L1", "L2", "L3", "L4"]).default("L2"), channel: z.enum(["web", "api"]).default("api") }),
    );
    const result = await ask(client, getSupabaseAdminClient(), { tenantId, userId, role, ...body });
    const status = result.explanation.status === "blocked" ? 422 : result.explanation.status === "denied" ? 403 : 200;
    return json(result, status);
  });
}
