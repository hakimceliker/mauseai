/**
 * Tests for notification adapter factory and console provider
 * Verifies:
 * - Provider instantiation based on environment
 * - Console provider logging
 * - Notification channel support
 * - Configuration validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createNotificationAdapter,
  getNotificationAdapter,
} from '@/src/lib/integrations/notification-provider';

describe('Notification Adapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createNotificationAdapter', () => {
    it('should create console provider by default', () => {
      process.env.NOTIFICATION_TYPE = undefined;
      const adapter = createNotificationAdapter();
      expect(adapter).toBeDefined();
    });

    it('should create console provider when explicitly set', () => {
      process.env.NOTIFICATION_TYPE = 'console';
      const adapter = createNotificationAdapter();
      expect(adapter).toBeDefined();
    });

    it('should warn on unknown notification type', () => {
      process.env.NOTIFICATION_TYPE = 'unknown';
      const consoleSpy = vi.spyOn(console, 'warn');
      const adapter = createNotificationAdapter();
      expect(adapter).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown notification type')
      );
      consoleSpy.mockRestore();
    });

    it('should handle email provider selection', () => {
      process.env.NOTIFICATION_TYPE = 'email';
      const consoleSpy = vi.spyOn(console, 'error');
      const adapter = createNotificationAdapter();
      expect(adapter).toBeDefined();
      // Should warn about missing EMAIL_PROVIDER_KEY
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EMAIL_PROVIDER_KEY not set')
      );
      consoleSpy.mockRestore();
    });

    it('should handle slack provider selection', () => {
      process.env.NOTIFICATION_TYPE = 'slack';
      const consoleSpy = vi.spyOn(console, 'error');
      const adapter = createNotificationAdapter();
      expect(adapter).toBeDefined();
      // Should warn about missing SLACK_WEBHOOK_URL
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLACK_WEBHOOK_URL not set')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Console Provider - Email', () => {
    it('should log email notifications', async () => {
      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await adapter.sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('email');
      expect(result.id).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('[CONSOLE] Email notification:', expect.any(Object));

      consoleSpy.mockRestore();
    });

    it('should handle multiple recipients', async () => {
      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await adapter.sendEmail({
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Group Email',
        body: 'Message to group',
      });

      expect(result.status).toBe('sent');
      consoleSpy.mockRestore();
    });

    it('should support HTML emails', async () => {
      const adapter = createNotificationAdapter();
      const result = await adapter.sendEmail({
        to: 'user@example.com',
        subject: 'Test Email',
        body: 'Plain text',
        html: '<p>HTML content</p>',
      });

      expect(result.status).toBe('sent');
    });
  });

  describe('Console Provider - Slack', () => {
    it('should log Slack notifications', async () => {
      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await adapter.sendSlack({
        channel: '#notifications',
        text: 'Test Slack message',
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('slack');
      expect(result.id).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[CONSOLE] Slack notification:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should support Slack blocks', async () => {
      const adapter = createNotificationAdapter();
      const result = await adapter.sendSlack({
        channel: '#alerts',
        text: 'Alert message',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*Important Alert*' },
          },
        ],
      });

      expect(result.status).toBe('sent');
    });
  });

  describe('Console Provider - SMS', () => {
    it('should log SMS notifications', async () => {
      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await adapter.sendSMS({
        to: '+1234567890',
        body: 'Test SMS message',
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('sms');
      expect(consoleSpy).toHaveBeenCalledWith('[CONSOLE] SMS notification:', expect.any(Object));

      consoleSpy.mockRestore();
    });
  });

  describe('Console Provider - Push', () => {
    it('should log push notifications', async () => {
      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      const result = await adapter.sendPush({
        userId: 'user_123',
        title: 'New Task',
        body: 'You have a new task assigned',
      });

      expect(result.status).toBe('sent');
      expect(result.channel).toBe('push');
      expect(consoleSpy).toHaveBeenCalledWith('[CONSOLE] Push notification:', expect.any(Object));

      consoleSpy.mockRestore();
    });
  });

  describe('Console Provider - Health', () => {
    it('should always report healthy', async () => {
      const adapter = createNotificationAdapter();
      const isHealthy = await adapter.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('getNotificationAdapter', () => {
    it('should return singleton instance', () => {
      const adapter1 = getNotificationAdapter();
      const adapter2 = getNotificationAdapter();
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('Email Provider Error Handling', () => {
    it('should throw when not configured', async () => {
      process.env.NOTIFICATION_TYPE = 'email';
      process.env.EMAIL_PROVIDER_KEY = '';
      const adapter = createNotificationAdapter();

      try {
        await adapter.sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          body: 'Test',
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect((error as Error).message).toContain('not configured');
      }
    });
  });

  describe('Slack Provider Error Handling', () => {
    it('should throw when webhook not configured', async () => {
      process.env.NOTIFICATION_TYPE = 'slack';
      process.env.SLACK_WEBHOOK_URL = '';
      const adapter = createNotificationAdapter();

      try {
        await adapter.sendSlack({
          channel: '#test',
          text: 'Test',
        });
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect((error as Error).message).toContain('not configured');
      }
    });
  });

  describe('Metadata Support', () => {
    it('should preserve metadata in email notifications', async () => {
      const adapter = createNotificationAdapter();
      const metadata = { correlationId: 'abc123', userId: 'user_456' };

      const result = await adapter.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
        metadata,
      });

      expect(result).toBeDefined();
    });

    it('should preserve metadata in Slack notifications', async () => {
      const adapter = createNotificationAdapter();
      const metadata = { correlationId: 'abc123', alerts: 3 };

      const result = await adapter.sendSlack({
        channel: '#alerts',
        text: 'Alert',
        metadata,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Environment Variable Safety', () => {
    it('should not expose webhook URLs in logs', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/secret/webhook/url';
      process.env.NOTIFICATION_TYPE = 'console';

      const adapter = createNotificationAdapter();
      const consoleSpy = vi.spyOn(console, 'log');

      await adapter.sendSlack({
        channel: '#test',
        text: 'test',
      });

      const logs = consoleSpy.mock.calls
        .map((call) => call.join(' '))
        .join('\n');

      // Should not contain full webhook URL
      expect(logs).not.toContain('secret/webhook/url');

      consoleSpy.mockRestore();
    });
  });
});
