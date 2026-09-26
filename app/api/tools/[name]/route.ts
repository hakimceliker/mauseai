import { json, HttpError, withTenant } from "@/src/server/http/tenant-route";
import { ToolRegistry } from "@/src/lib/core/tools";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { loadVisibleChunks } from "@/src/server/az/core-service";
import { audit } from "@/src/server/az/records";

/** L → R — invoke a tool: permission check, validation, risk scan and an audit record for every outcome. */
export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  return withTenant("tool.invoke.read", async ({ client, tenantId, userId, role }) => {
    const { name } = await params;
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      throw new HttpError(400, "invalid_json");
    }
    const admin = getSupabaseAdminClient();
    const chunks = name === "knowledge.search" ? await loadVisibleChunks(client, tenantId, userId) : [];
    const result = await new ToolRegistry().invoke(name, input, { tenantId, userId, role, chunks }, (record) =>
      audit(admin, { tenantId, actorType: "user", actorId: record.actorId, action: record.action, resourceType: "tool", resourceId: record.tool, payload: record.detail }),
    );
    const status = { ok: 200, denied: 403, invalid_input: 400, approval_required: 409, blocked: 422, error: 500, unknown_tool: 404 }[result.status];
    return json(result, status);
  });
}
