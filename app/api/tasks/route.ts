import { NextResponse } from "next/server";
import { CreateTaskSchema } from "@/src/lib/schemas/task";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { createTask } from "@/src/server/services/task-service";
import { inngest } from "@/src/inngest/client";
import { createHash } from "node:crypto";
import {
  getIdempotentResponse,
  saveIdempotentResponse,
} from "@/src/server/services/idempotency-service";
import { getTenantContext } from "@/src/server/auth/tenant-context";

export async function POST(request: Request) {
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

  const requestBody = await request.json();
  const parsed = CreateTaskSchema.safeParse(requestBody);
  if (!parsed.success)
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const requestHash = createHash("sha256")
    .update(JSON.stringify(parsed.data))
    .digest("hex");

  if (idempotencyKey) {
    if (idempotencyKey.length > 200)
      return NextResponse.json(
        { error: "invalid_idempotency_key" },
        { status: 400 },
      );
    try {
      const cached = await getIdempotentResponse(
        client,
        tenantId,
        idempotencyKey,
        requestHash,
      );
      if (cached)
        return NextResponse.json(cached.body, { status: cached.status });
    } catch {
      return NextResponse.json(
        { error: "idempotency_key_body_mismatch" },
        { status: 409 },
      );
    }
  }

  try {
    const task = await createTask(client, tenantId, user.id, parsed.data);
    const { data: workflow, error: workflowError } = await client
      .from("workflows")
      .insert({
        tenant_id: tenantId,
        task_id: task.id,
        name: "linear-mvp-workflow",
        version: 1,
        graph: {
          nodes: [
            { id: "start", type: "start", name: "Start" },
            { id: "execute", type: "ai", name: "Execute" },
            { id: "end", type: "end", name: "End" },
          ],
          edges: [
            { id: "start-execute", source: "start", target: "execute" },
            { id: "execute-end", source: "execute", target: "end" },
          ],
        },
      })
      .select("*")
      .single();
    if (workflowError) throw new Error(workflowError.message);

    const { data: stepRecord, error: stepError } = await client
      .from("steps")
      .insert({
        tenant_id: tenantId,
        task_id: task.id,
        workflow_id: workflow.id,
        node_id: "execute",
        name: "Execute goal",
        status: "pending",
        attempt: 1,
      })
      .select("*")
      .single();
    if (stepError) throw new Error(stepError.message);

    const { data: linkedTask, error: linkError } = await client
      .from("tasks")
      .update({
        workflow_id: workflow.id,
        current_step_id: stepRecord.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();
    if (linkError) throw new Error(linkError.message);

    await inngest.send({
      name: "mouseai/task.created",
      data: { taskId: linkedTask.id, tenantId, stepId: stepRecord.id },
    });
    const responseBody = { task: linkedTask, workflow, step: stepRecord };
    if (idempotencyKey)
      await saveIdempotentResponse(
        client,
        tenantId,
        idempotencyKey,
        requestHash,
        201,
        responseBody,
      );
    return NextResponse.json(responseBody, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "task_creation_failed" },
      { status: 500 },
    );
  }
}
