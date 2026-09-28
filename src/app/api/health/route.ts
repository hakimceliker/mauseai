import { NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';
import { getPaymentAdapter } from '@/src/lib/integrations';
import { getNotificationAdapter } from '@/src/lib/integrations';
import { getAnalyticsAdapter } from '@/src/lib/integrations';
import { getRealtimeProvider } from '@/src/lib/integrations';
import { getSupabaseAdminClient } from '@/src/lib/supabase/admin';
import { missingSupabaseRuntimeEnv, getSupabaseAnonKey, getSupabaseUrl } from '@/src/lib/supabase/env';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  database?: { status: string; latency?: number; code?: string; missing?: string[] };
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
  let database: NonNullable<HealthStatus['database']> = { status: 'error' };

  const missingDatabaseEnv = missingSupabaseRuntimeEnv();
  if (missingDatabaseEnv.length > 0) {
    database = {
      status: 'not_configured',
      code: 'credential_not_configured',
      // Names are safe diagnostic metadata; values are never exposed.
      missing: missingDatabaseEnv,
    };
  } else try {
    const startedAt = performance.now();
    const { error } = await getSupabaseAdminClient()
      .from('tenants')
      .select('id', { head: true, count: 'exact' });
    database = {
      status: error ? 'error' : 'ready',
      ...(error ? { code: error.code || 'query_failed' } : {}),
      ...(error ? {} : { latency: Math.round(performance.now() - startedAt) }),
    };
  } catch {
    database = { status: 'error', code: 'query_failed' };
  }

  try {
    getPaymentAdapter();
    integrations.payment = {
      status: 'ready',
      provider: process.env.PAYMENT_PROVIDER_TYPE || 'mock',
    };
  } catch {
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
  } catch {
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
  } catch {
    integrations.analytics = {
      status: 'error',
      type: process.env.ANALYTICS_TYPE || 'console',
    };
  }

  try {
    const realtimeProvider = getRealtimeProvider();
    const realtimeConfigured = Boolean(
      getSupabaseUrl() && getSupabaseAnonKey(),
    );
    integrations.realtime = {
      // Realtime is established by browser clients, not by this stateless
      // health request. Report configuration readiness here and keep the
      // actual socket state in the client-side connection monitor.
      status: realtimeProvider.isConnected() || realtimeConfigured ? 'ready' : 'degraded',
      connected: realtimeProvider.isConnected(),
    };
  } catch {
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
  if (database.status === 'error') overallStatus = 'unhealthy';
  if (database.status === 'not_configured' && overallStatus === 'healthy') {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp,
    version,
    uptime,
    database,
    integrations,
  };

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
  try {
    if (missingSupabaseRuntimeEnv().length > 0) {
      throw new Error('credential_not_configured');
    }
    const { error } = await getSupabaseAdminClient()
      .from('tenants')
      .select('id', { head: true, count: 'exact' });
    if (error) throw error;
  } catch {
    const result = NextResponse.json({ ready: false }, { status: 503 });
    addSecurityHeaders(result);
    return result;
  }

  const result = NextResponse.json(
    { ready: true },
    { status: 200 }
  );

  addSecurityHeaders(result);
  return result;
}
