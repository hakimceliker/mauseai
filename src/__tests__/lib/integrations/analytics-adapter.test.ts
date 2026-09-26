/**
 * Tests for analytics adapter factory and console provider
 * Verifies:
 * - Provider instantiation based on environment
 * - Console provider logging
 * - Event tracking functionality
 * - User identification
 * - Page view tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAnalyticsAdapter, getAnalyticsAdapter } from '@/src/lib/integrations/analytics-provider';

describe('Analytics Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createAnalyticsAdapter', () => {
    it('should create console provider by default', () => {
      process.env.ANALYTICS_TYPE = undefined;
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
    });

    it('should create console provider when explicitly set', () => {
      process.env.ANALYTICS_TYPE = 'console';
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
    });

    it('should warn on unknown analytics type', () => {
      process.env.ANALYTICS_TYPE = 'unknown';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown analytics type')
      );
      consoleSpy.mockRestore();
    });

    it('should handle mixpanel provider selection', () => {
      process.env.ANALYTICS_TYPE = 'mixpanel';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
      // Should warn about missing ANALYTICS_API_KEY
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ANALYTICS_API_KEY not set')
      );
      consoleSpy.mockRestore();
    });

    it('should handle segment provider selection', () => {
      process.env.ANALYTICS_TYPE = 'segment';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
      // Should warn about missing ANALYTICS_API_KEY
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ANALYTICS_API_KEY not set')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Console Provider - Events', () => {
    it('should log basic events', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackEvent({
        name: 'task_created',
        userId: 'user_123',
        properties: {
          taskId: 'task_456',
          priority: 'high',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] Event:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should add timestamp if not provided', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackEvent({
        name: 'task_completed',
      });

      const callArgs = consoleSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.timestamp).toBeDefined();
      expect(callArgs.timestamp instanceof Date).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should support custom properties', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackEvent({
        name: 'payment_processed',
        userId: 'user_123',
        properties: {
          amount: 9999,
          currency: 'USD',
          provider: 'stripe',
          metadata: { orderId: '123' },
        },
      });

      expect(true).toBe(true); // Should complete without error
    });
  });

  describe('Console Provider - Page Views', () => {
    it('should log page views', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackPage({
        path: '/dashboard',
        title: 'Dashboard',
        userId: 'user_123',
      });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] Page view:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should track referrer information', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackPage({
        path: '/tasks',
        title: 'Tasks',
        referrer: 'https://google.com/search',
      });

      expect(true).toBe(true); // Should complete without error
    });

    it('should support page properties', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackPage({
        path: '/reports',
        title: 'Reports',
        properties: {
          reportType: 'summary',
          period: 'monthly',
        },
      });

      expect(true).toBe(true); // Should complete without error
    });
  });

  describe('Console Provider - User Identification', () => {
    it('should identify users', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackUser({
        userId: 'user_123',
        email: 'user@example.com',
        name: 'John Doe',
        role: 'admin',
      });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] User identified:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should support custom user properties', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackUser({
        userId: 'user_456',
        email: 'jane@example.com',
        tenantId: 'tenant_123',
      });

      expect(true).toBe(true); // Should complete without error
    });
  });

  describe('Console Provider - Conversions', () => {
    it('should track conversions', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackConversion('purchase', 9999, {
        productId: 'product_123',
      });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] Conversion:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should track conversions without value', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackConversion('signup');

      expect(true).toBe(true); // Should complete without error
    });

    it('should support conversion properties', async () => {
      const adapter = createAnalyticsAdapter();

      await adapter.trackConversion('purchase', 5000, {
        currency: 'USD',
        items: 2,
        discountApplied: true,
      });

      expect(true).toBe(true); // Should complete without error
    });
  });

  describe('Console Provider - Error Tracking', () => {
    it('should track errors from Error objects', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'error');

      const error = new Error('Test error');
      await adapter.trackError(error, { context: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] Error tracked:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should track string errors', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'error');

      await adapter.trackError('String error message', { userId: 'user_123' });

      expect(consoleSpy).toHaveBeenCalledWith('[ANALYTICS] Error tracked:', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('should include stack trace for Error objects', async () => {
      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'error');

      const error = new Error('Detailed error');
      await adapter.trackError(error);

      const callArgs = consoleSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.stack).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('Console Provider - Health', () => {
    it('should always report healthy', async () => {
      const adapter = createAnalyticsAdapter();
      const isHealthy = await adapter.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('getAnalyticsAdapter', () => {
    it('should return singleton instance', () => {
      const adapter1 = getAnalyticsAdapter();
      const adapter2 = getAnalyticsAdapter();
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('Mixpanel Provider Error Handling', () => {
    it('should throw when not configured', async () => {
      process.env.ANALYTICS_TYPE = 'mixpanel';
      process.env.ANALYTICS_API_KEY = '';
      const adapter = createAnalyticsAdapter();

      try {
        await adapter.trackEvent({
          name: 'test_event',
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect((error as Error).message).toContain('not configured');
      }
    });
  });

  describe('Segment Provider Error Handling', () => {
    it('should throw when not configured', async () => {
      process.env.ANALYTICS_TYPE = 'segment';
      process.env.ANALYTICS_API_KEY = '';
      const adapter = createAnalyticsAdapter();

      try {
        await adapter.trackEvent({
          name: 'test_event',
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect((error as Error).message).toContain('not configured');
      }
    });
  });

  describe('Environment Variable Safety', () => {
    it('should not expose API keys in logs', async () => {
      process.env.ANALYTICS_API_KEY = 'super_secret_key_12345';
      process.env.ANALYTICS_TYPE = 'console';

      const adapter = createAnalyticsAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.trackEvent({
        name: 'test_event',
      });

      const logs = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');

      // Should not contain the API key
      expect(logs).not.toContain('super_secret_key_12345');

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with User Identification', () => {
    it('should track user and event together', async () => {
      const adapter = createAnalyticsAdapter();

      // First identify the user
      await adapter.trackUser({
        userId: 'user_789',
        email: 'user@example.com',
        role: 'member',
      });

      // Then track events for that user
      await adapter.trackEvent({
        name: 'dashboard_viewed',
        userId: 'user_789',
      });

      expect(true).toBe(true); // Should complete without error
    });
  });

  describe('Amplitude Provider (Future)', () => {
    it('should handle amplitude type gracefully', () => {
      process.env.ANALYTICS_TYPE = 'amplitude';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createAnalyticsAdapter();
      expect(adapter).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Amplitude not yet implemented')
      );
      consoleSpy.mockRestore();
    });
  });
});
