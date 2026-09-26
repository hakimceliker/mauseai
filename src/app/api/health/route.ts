import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring
 * Returns 200 with health status
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
