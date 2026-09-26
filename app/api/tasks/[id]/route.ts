import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { getTask } from "@/src/server/services/task-service";
import { getTenantContext } from "@/src/server/auth/tenant-context";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await getSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const tenantContext = await getTenantContext(client, user.id);
  if (!tenantContext)
    return NextResponse.json(
      { error: "tenant_context_required" },
      { status: 403 },
    );
  const { tenantId } = tenantContext;

  try {
    const task = await getTask(client, tenantId, (await params).id);
    return NextResponse.json({ task });
  } catch {
    return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  }
}
