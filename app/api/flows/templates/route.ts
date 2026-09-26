import { z } from "zod";
import { HttpError, json, must, parseBody, withTenant } from "@/src/server/http/tenant-route";
import { BUILTIN_TEMPLATES, compileToGraph, FlowTemplateSchema, validateTemplate } from "@/src/lib/flows/flows";
import { cloneTemplate } from "@/src/lib/growth/growth";
import { findTemplate } from "@/src/server/az/flow-service";

/** M — built-in and tenant flow templates; W — clone an existing template under a new key. */
export async function GET() {
  return withTenant("flow.run", async ({ client, tenantId }) => {
    const own = must(await client.from("flow_templates").select("key,name,version,steps,cloned_from").eq("tenant_id", tenantId).order("created_at", { ascending: false }), "templates_load");
    return json({ builtin: BUILTIN_TEMPLATES, tenant: own });
  });
}

const CreateSchema = z.union([
  z.object({ template: FlowTemplateSchema }),
  z.object({ cloneFrom: z.string().min(3), newKey: z.string().regex(/^[a-z0-9-]{3,60}$/), newName: z.string().min(3).max(200).optional() }),
]);

export async function POST(request: Request) {
  return withTenant("flow.manage", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, CreateSchema);
    const template = "template" in body ? body.template : cloneTemplate(await findTemplate(client, tenantId, body.cloneFrom), body.newKey, body.newName);
    const errors = validateTemplate(template);
    if (errors.length) throw new HttpError(422, "template_invalid", errors);
    const row = must(
      await client
        .from("flow_templates")
        .insert({
          tenant_id: tenantId,
          key: template.key,
          name: template.name,
          version: template.version,
          steps: template.steps,
          graph: compileToGraph(template),
          cloned_from: "cloneFrom" in body ? body.cloneFrom : null,
          created_by: userId,
        })
        .select("*")
        .single(),
      "template_create",
    );
    return json({ template: row }, 201);
  });
}
