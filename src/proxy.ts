import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders, handleCors } from '@/src/lib/middleware/security-headers';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers to all responses
  addSecurityHeaders(response);

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const method = request.method;

    const cors = handleCors(origin || undefined, method);

    if (!cors.shouldAllowRequest && method !== 'OPTIONS') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CORS_ERROR',
            message: 'CORS policy violation',
            id: 'cors-error',
          },
        },
        { status: 403 }
      );
    }

    // Add CORS headers to response
    Object.entries(cors.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: Object.entries(cors.headers).reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, string>
        ),
      });
    }
  }

  return response;
}

// Apply proxy to all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
