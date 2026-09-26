import { json, withTenant } from "@/src/server/http/tenant-route";
import { ToolRegistry } from "@/src/lib/core/tools";
import { can } from "@/src/lib/isolation/guard";

/** L — tools and whether the caller may use them. */
export async function GET() {
  return withTenant("tool.invoke.read", async ({ role }) => json({ tools: new ToolRegistry().list().map((t) => ({ ...t, allowed: can(role, t.permission) })) }));
}
