import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "mouseai-core",
    status: "ok",
    phase: "mvp-core",
  });
}
