import { z } from "zod";
import { json, must, parseBody, HttpError, withTenant } from "@/src/server/http/tenant-route";
import { senderStatus } from "@/src/lib/notifications/senders";

/** N — per-tenant delivery routes: which team gets which channel, from which priority, outside which quiet hours. */

const TEAMS = ["product", "engineering", "data", "legal", "support"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const RouteSchema = z
  .object({
    team: z.enum(TEAMS),
    channel: z.enum(["email", "slack", "teams"]),
    destination: z.string().trim().min(1).max(320),
    minPriority: z.enum(PRIORITIES).default("normal"),
    quietStartHour: z.number().int().min(0).max(23).nullable().default(null),
    quietEndHour: z.number().int().min(0).max(23).nullable().default(null),
    timezone: z.string().min(1).max(64).default("Europe/Istanbul"),
  })
  .refine((r) => r.channel !== "email" || z.string().email().safeParse(r.destination).success, { message: "email destination must be an e-mail address", path: ["destination"] })
  .refine((r) => (r.quietStartHour === null) === (r.quietEndHour === null), { message: "quiet hours need both start and end", path: ["quietEndHour"] })
  .refine((r) => validTimeZone(r.timezone), { message: "unknown time zone", path: ["timezone"] });

export async function GET() {
  return withTenant("notification.read", async ({ client, tenantId }) => {
    const routes = must(await client.from("notification_routes").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: true }), "routes_load") as Array<{ channel: "email" | "slack" | "teams" }>;
    return json({ routes: routes.map((r) => ({ ...r, channelConfigured: senderStatus(r.channel).configured })) });
  });
}

export async function POST(request: Request) {
  return withTenant("notification.manage", async ({ client, tenantId, userId }) => {
    const body = await parseBody(request, RouteSchema);
    const result = await client
      .from("notification_routes")
      .insert({
        tenant_id: tenantId,
        team: body.team,
        channel: body.channel,
        destination: body.destination,
        min_priority: body.minPriority,
        quiet_start_hour: body.quietStartHour,
        quiet_end_hour: body.quietEndHour,
        timezone: body.timezone,
        created_by: userId,
      })
      .select("*")
      .single();
    if (result.error?.code === "23505") throw new HttpError(409, "route_exists");
    const route = must(result, "route_create");
    const status = senderStatus(body.channel);
    return json({ route, channelConfigured: status.configured, missingEnv: status.missingEnv }, 201);
  });
}
