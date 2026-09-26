import { NextResponse } from "next/server";
import { getReadiness } from "@/src/lib/health/readiness";
import { addSecurityHeaders } from "@/src/lib/middleware/security-headers";

// Readiness must reflect live dependency state, never a build-time snapshot.
export const dynamic = "force-dynamic";

async function readinessResponse(includeBody: boolean) {
  const report = await getReadiness();
  const init = {
    status: report.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  };
  const response = includeBody
    ? NextResponse.json(report, init)
    : new NextResponse(null, init);
  return addSecurityHeaders(response);
}

export function GET() {
  return readinessResponse(true);
}

export function HEAD() {
  return readinessResponse(false);
}
