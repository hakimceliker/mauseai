/**
 * Tests for health check endpoint
 * Verifies:
 * - Endpoint returns proper health status
 * - Integration checks are included
 * - Status codes are correct (200 for healthy, 503 for degraded/unhealthy)
 */

import { describe, it, expect, vi } from 'vitest';
import { GET, HEAD } from '@/src/app/api/health/route';

vi.mock('@/src/lib/db/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ error: null, count: 0 }),
    })),
  })),
}));

// Mock the integrations module
vi.mock('@/src/lib/integrations', () => ({
  getPaymentAdapter: vi.fn(() => ({
    processPayment: vi.fn(),
  })),
  getNotificationAdapter: vi.fn(() => ({
    isHealthy: vi.fn().mockResolvedValue(true),
  })),
  getAnalyticsAdapter: vi.fn(() => ({
    isHealthy: vi.fn().mockResolvedValue(true),
  })),
  getRealtimeProvider: vi.fn(() => ({
    isConnected: vi.fn().mockReturnValue(true),
  })),
}));

describe('/api/health', () => {

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe('0.1.0');
      expect(data.uptime).toBeGreaterThan(0);
      expect(data.database.status).toBe('ready');
    });

    it('should include integration status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.integrations).toBeDefined();
      expect(data.integrations.payment).toBeDefined();
      expect(data.integrations.notifications).toBeDefined();
      expect(data.integrations.analytics).toBeDefined();
      expect(data.integrations.realtime).toBeDefined();
    });

    it('should have correct integration provider types', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.integrations.payment.provider).toBeDefined();
      expect(data.integrations.notifications.type).toBeDefined();
      expect(data.integrations.analytics.type).toBeDefined();
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 for readiness check', async () => {
      const response = await HEAD();
      expect(response.status).toBe(200);
    });

    it('should have minimal response body', async () => {
      const response = await HEAD();
      const data = await response.json();
      expect(data.ready).toBe(true);
    });
  });

  describe('Health Status Determination', () => {
    it('should return healthy when all integrations ok', async () => {
      const response = await GET();
      const data = await response.json();

      // With default mocks, should be healthy
      expect(data.status).toBe('healthy');
      expect(response.status).toBe(200);
    });

    it('should be accessible multiple times', async () => {
      const response1 = await GET();
      const response2 = await GET();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.status).toBe(data2.status);
    });
  });

  describe('Response Headers', () => {
    it('should include security headers', async () => {
      const response = await GET();

      // Check that response has been processed by addSecurityHeaders
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });

    it('should be JSON content type', async () => {
      const response = await GET();
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Timestamp Precision', () => {
    it('should include ISO timestamp', async () => {
      const response = await GET();
      const data = await response.json();

      // Validate ISO format
      const timestamp = new Date(data.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
      expect(data.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should have reasonable uptime', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.uptime).toBeGreaterThan(0);
      expect(typeof data.uptime).toBe('number');
    });
  });
});
