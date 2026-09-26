import { NextResponse } from "next/server";
import { inngest } from "@/src/inngest/client";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";

const resumableStatuses = ["paused", "failed", "waiting_approval"];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await getSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: task, error } = await client
    .from("tasks")
    .select("id,tenant_id,status,current_step_id")
    .eq("id", (await params).id)
    .single();
  if (error || !task)
    return NextResponse.json({ error: "task_not_found" }, { status: 404 });
  if (!resumableStatuses.includes(task.status))
    return NextResponse.json({ error: "task_not_resumable" }, { status: 400 });
  if (!task.current_step_id)
    return NextResponse.json({ error: "task_step_missing" }, { status: 409 });

  await inngest.send({
    name: "mouseai/task.created",
    data: {
      taskId: task.id,
      tenantId: task.tenant_id,
      stepId: task.current_step_id,
      resume: true,
    },
  });
  return NextResponse.json({
    ok: true,
    message: "resume_triggered",
    taskId: task.id,
  });
}
