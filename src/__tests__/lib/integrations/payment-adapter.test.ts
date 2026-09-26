/**
 * Tests for payment adapter factory and mock provider
 * Verifies:
 * - Provider instantiation based on environment
 * - Mock provider functionality
 * - Config validation
 * - Error handling for missing keys
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPaymentAdapter, getPaymentAdapter } from '@/src/lib/integrations/payment-adapter';

describe('Payment Adapter', () => {
  // Store original env vars
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };
    // Clear singleton
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createPaymentAdapter', () => {
    it('should create mock provider by default', () => {
      process.env.PAYMENT_PROVIDER_TYPE = undefined;
      const adapter = createPaymentAdapter();
      expect(adapter).toBeDefined();
      // Mock provider should succeed without API key
    });

    it('should create mock provider when explicitly set', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'mock';
      const adapter = createPaymentAdapter();
      expect(adapter).toBeDefined();
    });

    it('should accept null as fallback to mock', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'null';
      const adapter = createPaymentAdapter();
      expect(adapter).toBeDefined();
    });

    it('should throw error when stripe provider selected without API key', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'stripe';
      process.env.PAYMENT_API_KEY = '';
      expect(() => createPaymentAdapter()).toThrow('Stripe provider requires PAYMENT_API_KEY');
    });

    it('should throw error when square provider selected without API key', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'square';
      process.env.PAYMENT_API_KEY = '';
      expect(() => createPaymentAdapter()).toThrow('Square provider requires PAYMENT_API_KEY');
    });

    it('should warn on unknown provider type', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'unknown';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createPaymentAdapter();
      expect(adapter).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown payment provider type')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Mock Provider', () => {
    it('should process payment successfully', async () => {
      const adapter = createPaymentAdapter();
      const transaction = await adapter.processPayment(
        9999,
        'USD',
        'customer_123',
        'Test payment'
      );

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('completed');
      expect(transaction.amount).toBe(9999);
      expect(transaction.currency).toBe('USD');
      expect(transaction.customerId).toBe('customer_123');
      expect(transaction.id).toBeDefined();
      expect(transaction.createdAt).toBeDefined();
    });

    it('should refund successfully', async () => {
      const adapter = createPaymentAdapter();
      const refund = await adapter.refund('txn_123', 5000);

      expect(refund).toBeDefined();
      expect(refund.status).toBe('completed');
      expect(refund.originalTransactionId).toBe('txn_123');
      expect(refund.amount).toBe(5000);
      expect(refund.refundId).toBeDefined();
    });

    it('should check balance successfully', async () => {
      const adapter = createPaymentAdapter();
      const balance = await adapter.checkBalance();

      expect(balance).toBeDefined();
      expect(balance.available).toBe(10000);
      expect(balance.pending).toBe(0);
      expect(balance.currency).toBe('USD');
    });

    it('should verify webhook signature (mock always returns true)', () => {
      const adapter = createPaymentAdapter();
      const isValid = adapter.verifyWebhookSignature('signature', 'body');
      expect(isValid).toBe(true);
    });
  });

  describe('getPaymentAdapter', () => {
    it('should return singleton instance', () => {
      const adapter1 = getPaymentAdapter();
      const adapter2 = getPaymentAdapter();
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('Environment Variable Safety', () => {
    it('should not expose API keys in logs by default', async () => {
      process.env.PAYMENT_API_KEY = 'sk_test_super_secret_key';
      const consoleSpy = vi.spyOn(console, 'log');

      const adapter = createPaymentAdapter();
      await adapter.processPayment(100, 'USD', 'customer_123');

      // Check that secret key is not logged
      const logs = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');
      expect(logs).not.toContain('sk_test_super_secret_key');

      consoleSpy.mockRestore();
    });

    it('should load API key from environment variable', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'stripe';
      process.env.PAYMENT_API_KEY = 'sk_test_valid_key';
      // Should not throw
      expect(() => createPaymentAdapter()).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle missing PAYMENT_WEBHOOK_SECRET gracefully', () => {
      process.env.PAYMENT_PROVIDER_TYPE = 'stripe';
      process.env.PAYMENT_API_KEY = 'sk_test_key';
      process.env.PAYMENT_WEBHOOK_SECRET = '';

      expect(() => createPaymentAdapter()).not.toThrow();
    });

    it('should support multiple environment variables format', () => {
      // Test various key formats
      process.env.PAYMENT_PROVIDER_TYPE = 'mock';
      process.env.PAYMENT_API_KEY = '';
      process.env.PAYMENT_WEBHOOK_SECRET = '';

      const adapter = createPaymentAdapter();
      expect(adapter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle payment processing with metadata', async () => {
      const adapter = createPaymentAdapter();
      const metadata = { orderId: '123', userId: 'user_456' };

      const transaction = await adapter.processPayment(
        5000,
        'USD',
        'customer_123',
        'Order #123',
        metadata
      );

      expect(transaction.metadata).toEqual(metadata);
    });

    it('should handle partial refunds', async () => {
      const adapter = createPaymentAdapter();

      // Full refund (no amount specified)
      const fullRefund = await adapter.refund('txn_123');
      expect(fullRefund).toBeDefined();

      // Partial refund
      const partialRefund = await adapter.refund('txn_123', 5000);
      expect(partialRefund.amount).toBe(5000);
    });
  });
});
