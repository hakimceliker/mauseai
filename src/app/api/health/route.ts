import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

/**
 * Health check endpoint for monitoring
 * Returns 200 with health status
 */
export async function GET() {
  const result = NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      uptime: process.uptime(),
    },
    { status: 200 }
  );

  addSecurityHeaders(result);
  return result;
}
