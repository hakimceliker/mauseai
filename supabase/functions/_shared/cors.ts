const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN");

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "http://localhost:3000",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    Vary: "Origin",
  };
}
