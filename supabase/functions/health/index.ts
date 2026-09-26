import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (request) => {
  const headers = corsHeaders();
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  return new Response(JSON.stringify({ status: "ok", service: "mouseai-edge" }), { headers: { ...headers, "Content-Type": "application/json" } });
});
