/**
 * Notification provider interface
 * Supports multiple channels: email, Slack, SMS, push notifications
 * Implementations can be swapped without changing application code
 *
 * Configuration:
 * - NOTIFICATION_TYPE: Type of notification (console, email, slack, multi)
 * - EMAIL_PROVIDER_KEY / RESEND_API_KEY: API key for email provider
 * - EMAIL_FROM: verified sender address for the email provider
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
 * Delivery retries and tracking belong in the durable notification workflow;
 * this adapter is intentionally one request per call and never logs secrets.
 */
export interface INotificationProvider {
  /**
   * Send an email notification
   * @param message Email message details
   * @returns Notification result with ID and status
   *
   */
  sendEmail(message: EmailMessage): Promise<NotificationResult>;

  /**
   * Send a Slack notification
   * @param message Slack message details
   * @returns Notification result with ID and status
   *
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
 * Email provider implementation using the Resend HTTP API.
 * The key and sender are server-only environment variables.
 */
class EmailNotificationProvider implements INotificationProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendEmail(message: EmailMessage): Promise<NotificationResult> {
    if (!this.apiKey || !this.from) {
      throw new Error('credential_not_configured:RESEND_API_KEY/EMAIL_FROM (not configured)');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
        ...(message.html ? { html: message.html } : {}),
        ...(message.cc ? { cc: message.cc } : {}),
        ...(message.bcc ? { bcc: message.bcc } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('NOTIFICATION_PROVIDER_ERROR');
    const result = (await response.json()) as { id?: string };
    return {
      id: result.id ?? `email_${Date.now()}`,
      status: 'sent',
      channel: 'email',
      timestamp: new Date(),
    };
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
    return Boolean(this.apiKey && this.from);
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

  async sendSlack(message: SlackMessage): Promise<NotificationResult> {
    if (!this.webhookUrl) throw new Error('credential_not_configured:SLACK_WEBHOOK_URL (not configured)');
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: message.text,
        ...(message.blocks ? { blocks: message.blocks } : {}),
        ...(message.threadTs ? { thread_ts: message.threadTs } : {}),
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('NOTIFICATION_PROVIDER_ERROR');
    return { id: `slack_${Date.now()}`, status: 'sent', channel: 'slack', timestamp: new Date() };
  }

  async sendSMS(_message: SMSMessage): Promise<NotificationResult> {
    throw new Error('SMS not available with Slack provider');
  }

  async sendPush(_message: PushMessage): Promise<NotificationResult> {
    throw new Error('Push not available with Slack provider');
  }

  async isHealthy(): Promise<boolean> {
    // A webhook cannot be health-probed without sending a real notification.
    // Presence is reported here; delivery errors are surfaced by sendSlack.
    return Boolean(this.webhookUrl);
  }
}

/**
 * Factory function to create notification provider
 *
 * Configuration:
 * - NOTIFICATION_TYPE: Type (console, email, slack, multi)
 * - RESEND_API_KEY: Resend API key (required for email)
 * - EMAIL_FROM: verified sender address (required for email)
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

  if (
    process.env.NODE_ENV === 'production' &&
    (notificationType === 'console' || notificationType === 'multi' ||
      !['email', 'slack'].includes(notificationType))
  ) {
    throw new Error('credential_not_configured:NOTIFICATION_TYPE');
  }

  switch (notificationType) {
    case 'email': {
      const emailKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_KEY;
      const emailFrom = process.env.EMAIL_FROM || '';
      if (!emailKey || !emailFrom) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('credential_not_configured:RESEND_API_KEY_OR_EMAIL_FROM');
        }
        console.error(
          'Email notifications selected but RESEND_API_KEY or EMAIL_FROM is not set. ' +
          'Configure the approved secret store (never commit credentials)'
        );
      }
      return new EmailNotificationProvider(emailKey || '', emailFrom);
    }

    case 'slack': {
      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (!slackUrl) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('credential_not_configured:SLACK_WEBHOOK_URL');
        }
        console.error('Slack notifications selected but SLACK_WEBHOOK_URL not set');
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
