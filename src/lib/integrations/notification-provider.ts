/**
 * Notification provider interface
 * Supports multiple channels: email, Slack, SMS, push notifications
 * Implementations can be swapped without changing application code
 *
 * Configuration:
 * - NOTIFICATION_TYPE: Type of notification (console, email, slack, multi)
 * - EMAIL_PROVIDER_KEY: API key for email provider
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 * - SMS_API_KEY: SMS provider API key
 *
 * Security:
 * - All API keys must come from environment variables
 * - Never hardcode credentials
 * - Use .env.local for local development (never commit)
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface SlackMessage {
  channel: string; // Channel ID or name
  text: string; // Plain text message
  blocks?: Record<string, unknown>[]; // Slack Block Kit format
  threadTs?: string; // Reply to thread
  metadata?: Record<string, unknown>;
}

export interface SMSMessage {
  to: string; // Phone number
  body: string;
  metadata?: Record<string, unknown>;
}

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  id: string;
  status: 'sent' | 'queued' | 'failed';
  channel: string;
  timestamp: Date;
  error?: string;
}

/**
 * Notification provider interface
 * Single provider handles all notification channels
 * or route to channel-specific implementations
 *
 * TODO: Implement batching for better performance
 * TODO: Implement retry logic with exponential backoff
 * TODO: Implement delivery tracking and bounce handling
 * TODO: Add email templates and Slack templates
 */
export interface INotificationProvider {
  /**
   * Send an email notification
   * @param message Email message details
   * @returns Notification result with ID and status
   *
   * TODO: Implement email sending
   * TODO: Validate email addresses
   * TODO: Handle bounce/failure responses
   * TODO: Support HTML and plain text
   * TODO: Track delivery for analytics
   */
  sendEmail(message: EmailMessage): Promise<NotificationResult>;

  /**
   * Send a Slack notification
   * @param message Slack message details
   * @returns Notification result with ID and status
   *
   * TODO: Implement Slack webhook integration
   * TODO: Support rich formatting with Block Kit
   * TODO: Handle Slack rate limiting
   * TODO: Log message for audit trail
   */
  sendSlack(message: SlackMessage): Promise<NotificationResult>;

  /**
   * Send an SMS notification
   * @param message SMS message details
   * @returns Notification result with ID and status
   *
   * TODO: Implement SMS provider integration
   * TODO: Validate phone numbers
   * TODO: Handle delivery confirmation
   * TODO: Support multiple carriers
   */
  sendSMS(message: SMSMessage): Promise<NotificationResult>;

  /**
   * Send a push notification
   * @param message Push notification details
   * @returns Notification result with ID and status
   *
   * TODO: Implement push notification service
   * TODO: Support iOS and Android
   * TODO: Handle device token management
   */
  sendPush(message: PushMessage): Promise<NotificationResult>;

  /**
   * Check if notification system is healthy
   * @returns true if notifications can be sent
   *
   * TODO: Check provider connectivity
   * TODO: Verify credentials are valid
   * TODO: Check rate limits
   */
  isHealthy(): Promise<boolean>;
}

/**
 * Console notification provider (development)
 * Logs all notifications to console instead of sending
 * Useful for testing and local development
 */
class ConsoleNotificationProvider implements INotificationProvider {
  async sendEmail(message: EmailMessage): Promise<NotificationResult> {
    const id = `console_email_${Date.now()}`;
    console.log('[CONSOLE] Email notification:', {
      id,
      to: message.to,
      subject: message.subject,
      body: message.body.substring(0, 100) + '...',
    });
    return {
      id,
      status: 'sent',
      channel: 'email',
      timestamp: new Date(),
    };
  }

  async sendSlack(message: SlackMessage): Promise<NotificationResult> {
    const id = `console_slack_${Date.now()}`;
    console.log('[CONSOLE] Slack notification:', {
      id,
      channel: message.channel,
      text: message.text.substring(0, 100) + '...',
    });
    return {
      id,
      status: 'sent',
      channel: 'slack',
      timestamp: new Date(),
    };
  }

  async sendSMS(message: SMSMessage): Promise<NotificationResult> {
    const id = `console_sms_${Date.now()}`;
    console.log('[CONSOLE] SMS notification:', {
      id,
      to: message.to,
      body: message.body.substring(0, 100) + '...',
    });
    return {
      id,
      status: 'sent',
      channel: 'sms',
      timestamp: new Date(),
    };
  }

  async sendPush(message: PushMessage): Promise<NotificationResult> {
    const id = `console_push_${Date.now()}`;
    console.log('[CONSOLE] Push notification:', {
      id,
      userId: message.userId,
      title: message.title,
      body: message.body.substring(0, 100) + '...',
    });
    return {
      id,
      status: 'sent',
      channel: 'push',
      timestamp: new Date(),
    };
  }

  async isHealthy(): Promise<boolean> {
    return true; // Console provider always works
  }
}

/**
 * Email provider implementation
 * TODO: Implement with SendGrid, AWS SES, or similar
 */
class EmailNotificationProvider implements INotificationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(_message: EmailMessage): Promise<NotificationResult> {
    // TODO: Implement email sending with provider
    // TODO: Validate email addresses
    // TODO: Handle HTML and plain text
    throw new Error('Email provider not configured. Set EMAIL_PROVIDER_KEY');
  }

  async sendSlack(_message: SlackMessage): Promise<NotificationResult> {
    throw new Error('Use SlackNotificationProvider for Slack messages');
  }

  async sendSMS(_message: SMSMessage): Promise<NotificationResult> {
    throw new Error('SMS not available with Email provider');
  }

  async sendPush(_message: PushMessage): Promise<NotificationResult> {
    throw new Error('Push not available with Email provider');
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Validate provider credentials
    return false;
  }
}

/**
 * Slack notification provider
 * Uses incoming webhook for simple message posting
 */
class SlackNotificationProvider implements INotificationProvider {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendEmail(_message: EmailMessage): Promise<NotificationResult> {
    throw new Error('Email not available with Slack provider');
  }

  async sendSlack(_message: SlackMessage): Promise<NotificationResult> {
    // TODO: Implement Slack webhook posting
    // TODO: Support Block Kit formatting
    // TODO: Handle rate limiting (Slack allows 1 request/second per webhook)
    console.log('[Slack Provider] Would send to webhook:', this.webhookUrl);
    throw new Error('Slack provider not configured. Set SLACK_WEBHOOK_URL');
  }

  async sendSMS(_message: SMSMessage): Promise<NotificationResult> {
    throw new Error('SMS not available with Slack provider');
  }

  async sendPush(_message: PushMessage): Promise<NotificationResult> {
    throw new Error('Push not available with Slack provider');
  }

  async isHealthy(): Promise<boolean> {
    // TODO: Test webhook connectivity
    return false;
  }
}

/**
 * Factory function to create notification provider
 *
 * Configuration:
 * - NOTIFICATION_TYPE: Type (console, email, slack, multi)
 * - EMAIL_PROVIDER_KEY: Email API key (required for email)
 * - SLACK_WEBHOOK_URL: Slack webhook (required for slack)
 *
 * Environment Variable Safety:
 * - Never hardcode credentials
 * - Load from environment only
 * - Warn if production type without credentials
 * - Default to console for safety
 *
 * @returns Configured notification provider
 */
export function createNotificationAdapter(): INotificationProvider {
  const notificationType = (process.env.NOTIFICATION_TYPE || 'console').toLowerCase();

  switch (notificationType) {
    case 'email': {
      const emailKey = process.env.EMAIL_PROVIDER_KEY;
      if (!emailKey) {
        console.error(
          'Email notifications selected but EMAIL_PROVIDER_KEY not set. ' +
          'Add to .env.local (never commit to git)'
        );
      }
      return new EmailNotificationProvider(emailKey || '');
    }

    case 'slack': {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (!slackUrl) {
        console.error(
          'Slack notifications selected but SLACK_WEBHOOK_URL not set. ' +
          'Add to .env.local (never commit to git)'
        );
      }
      return new SlackNotificationProvider(slackUrl || '');
    }

    case 'multi': {
      // TODO: Implement multi-provider that sends to multiple channels
      console.warn('Multi-provider not yet implemented, using console');
      return new ConsoleNotificationProvider();
    }

    case 'console':
    default: {
      if (notificationType !== 'console') {
        console.warn(
          `Unknown notification type: ${notificationType}. Defaulting to console provider`
        );
      }
      return new ConsoleNotificationProvider();
    }
  }
}

// Singleton instance
let notificationAdapter: INotificationProvider | null = null;

/**
 * Get or create notification provider singleton
 * @returns Notification provider instance
 */
export function getNotificationAdapter(): INotificationProvider {
  if (!notificationAdapter) {
    notificationAdapter = createNotificationAdapter();
  }
  return notificationAdapter;
}
