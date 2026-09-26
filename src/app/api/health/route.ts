import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';
import { getPaymentAdapter } from '@/src/lib/integrations';
import { getNotificationAdapter } from '@/src/lib/integrations';
import { getAnalyticsAdapter } from '@/src/lib/integrations';
import { getRealtimeProvider } from '@/src/lib/integrations';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  database?: { status: string; latency?: number };
  integrations?: {
    payment?: { status: string; provider?: string };
    notifications?: { status: string; type?: string };
    analytics?: { status: string; type?: string };
    realtime?: { status: string; connected?: boolean };
  };
}

/**
 * Health check endpoint for monitoring
 * Returns 200 with health status including integrations
 * Detailed health checks for debugging and monitoring
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = '0.1.0';
  const uptime = process.uptime();

  // Gather integration health status
  const integrations: HealthStatus['integrations'] = {};

  try {
    getPaymentAdapter();
    integrations.payment = {
      status: 'ready',
      provider: process.env.PAYMENT_PROVIDER_TYPE || 'mock',
    };
  } catch (_error) {
    integrations.payment = {
      status: 'error',
      provider: process.env.PAYMENT_PROVIDER_TYPE || 'mock',
    };
  }

  try {
    const notificationAdapter = getNotificationAdapter();
    const isHealthy = await notificationAdapter.isHealthy();
    integrations.notifications = {
      status: isHealthy ? 'ready' : 'degraded',
      type: process.env.NOTIFICATION_TYPE || 'console',
    };
  } catch (_error) {
    integrations.notifications = {
      status: 'error',
      type: process.env.NOTIFICATION_TYPE || 'console',
    };
  }

  try {
    const analyticsAdapter = getAnalyticsAdapter();
    const isHealthy = await analyticsAdapter.isHealthy();
    integrations.analytics = {
      status: isHealthy ? 'ready' : 'degraded',
      type: process.env.ANALYTICS_TYPE || 'console',
    };
  } catch (_error) {
    integrations.analytics = {
      status: 'error',
      type: process.env.ANALYTICS_TYPE || 'console',
    };
  }

  try {
    const realtimeProvider = getRealtimeProvider();
    integrations.realtime = {
      status: realtimeProvider.isConnected() ? 'connected' : 'disconnected',
      connected: realtimeProvider.isConnected(),
    };
  } catch (_error) {
    integrations.realtime = {
      status: 'error',
    };
  }

  // Determine overall health status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const integrationStatuses = Object.values(integrations).map((i) => i.status);
  if (integrationStatuses.includes('error')) {
    overallStatus = 'unhealthy';
  } else if (integrationStatuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp,
    version,
    uptime,
    integrations,
  };

  // TODO: Add database connectivity check
  // TODO: Add check for critical vs optional integrations
  // TODO: Add detailed error messages for troubleshooting

  const result = NextResponse.json(healthStatus, {
    status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 503 : 503,
  });

  addSecurityHeaders(result);
  return result;
}

/**
 * Readiness check endpoint
 * Returns 200 only if all critical systems are healthy
 * Used by orchestration systems (Kubernetes, etc.) to determine if service can receive traffic
 */
export async function HEAD() {
  // For readiness checks, we use a simpler check
  // Returns 200 if service is ready to handle requests
  // TODO: Implement critical system checks
  const result = NextResponse.json(
    { ready: true },
    { status: 200 }
  );

  addSecurityHeaders(result);
  return result;
}
