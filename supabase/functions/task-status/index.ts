import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase.ts";

const QuerySchema = z.object({ taskId: z.string().uuid() });

Deno.serve(async (request) => {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

  const parsed = QuerySchema.safeParse({ taskId: new URL(request.url).searchParams.get("taskId") });
  if (!parsed.success) return new Response(JSON.stringify({ error: "invalid_input" }), { status: 400, headers });

  const supabase = createUserClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });

  const { data: task, error } = await supabase.from("tasks").select("id,status,spent_cents,risk_level").eq("id", parsed.data.taskId).single();
  if (error || !task) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  return new Response(JSON.stringify({ task }), { headers: { ...headers, "Content-Type": "application/json" } });
});
