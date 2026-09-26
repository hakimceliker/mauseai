import { json, withTenant } from "@/src/server/http/tenant-route";
import { listChannels } from "@/src/lib/channels/channels";

/** C — channels and whether each is usable here (credentials are reported as missing, never faked). */
export async function GET() {
  return withTenant("knowledge.read", async () => json({ channels: listChannels() }));
}
