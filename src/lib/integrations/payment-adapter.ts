import {
  IPaymentProvider,
  PaymentTransaction,
  RefundResult,
  BalanceInfo,
} from './payment-provider';
import { createHmac, timingSafeEqual } from 'node:crypto';

class CredentialNotConfiguredError extends Error {
  constructor(variable: string) {
    super(`credential_not_configured:${variable}`);
    this.name = 'CredentialNotConfiguredError';
  }
}

export function isLiveStripeCredential(value: string): boolean {
  return /^(sk|rk)_live_/i.test(value.trim());
}

class LiveModeNotApprovedError extends Error {
  constructor() { super('live_mode_not_approved'); this.name = 'LiveModeNotApprovedError'; }
}

/**
 * Mock payment provider for development
 * Simulates payment processing without connecting to real payment systems
 */
class MockPaymentProvider implements IPaymentProvider {
  async processPayment(
    amount: number,
    currency: string,
    customerId: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // Mock implementation logs and returns success
    console.log('[MOCK] Processing payment', {
      amount,
      currency,
      customerId,
      description,
      metadata,
    });

    return {
      id: `mock_txn_${Date.now()}`,
      amount,
      currency,
      status: 'completed',
      customerId,
      description,
      metadata,
      createdAt: new Date(),
    };
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    console.log('[MOCK] Processing refund', { transactionId, amount });

    return {
      refundId: `mock_ref_${Date.now()}`,
      amount: amount || 0,
      status: 'completed',
      originalTransactionId: transactionId,
    };
  }

  async checkBalance(): Promise<BalanceInfo> {
    console.log('[MOCK] Checking balance');

    return {
      available: 10000, // $100.00 in cents
      pending: 0,
      currency: 'USD',
    };
  }

  verifyWebhookSignature(_signature: string, _body: string): boolean {
    // Mock always returns true for development
    console.log('[MOCK] Verifying webhook signature');
    return true;
  }
}

/** Stripe PaymentIntent adapter. It never receives or logs card data. */
class StripePaymentProvider implements IPaymentProvider {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    if (isLiveStripeCredential(apiKey)) throw new LiveModeNotApprovedError();
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async processPayment(
    amount: number,
    currency: string,
    customerId: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    const form = new URLSearchParams({
      amount: String(Math.round(amount)),
      currency: currency.toLowerCase(),
      confirm: 'false',
      'automatic_payment_methods[enabled]': 'true',
    });
    if (customerId) form.set('customer', customerId);
    if (description) form.set('description', description);
    for (const [key, value] of Object.entries(metadata ?? {})) form.set(`metadata[${key}]`, String(value));
    const response = await this.request('/payment_intents', { method: 'POST', body: form });
    return {
      id: String(response.id),
      amount: Number(response.amount ?? amount),
      currency: String(response.currency ?? currency),
      status: this.mapStatus(String(response.status)),
      customerId,
      description,
      metadata,
      createdAt: new Date(Number(response.created ?? Math.floor(Date.now() / 1000)) * 1000),
    };
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    const form = new URLSearchParams({ payment_intent: transactionId });
    if (amount !== undefined) form.set('amount', String(Math.round(amount)));
    const response = await this.request('/refunds', { method: 'POST', body: form });
    return {
      refundId: String(response.id),
      amount: Number(response.amount ?? amount ?? 0),
      status: response.status === 'succeeded' ? 'completed' : response.status === 'failed' ? 'failed' : 'pending',
      originalTransactionId: transactionId,
    };
  }

  async checkBalance(): Promise<BalanceInfo> {
    const response = await this.request('/balance', { method: 'GET' });
    const available = Array.isArray(response.available) ? response.available[0] : undefined;
    const pending = Array.isArray(response.pending) ? response.pending[0] : undefined;
    return {
      available: Number(available?.amount ?? 0),
      pending: Number(pending?.amount ?? 0),
      currency: String(available?.currency ?? 'usd'),
    };
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
    if (!this.webhookSecret || !signature) return false;
    const parts = signature.split(',');
    const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
    if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
    const expected = createHmac('sha256', this.webhookSecret).update(`${timestamp}.${body}`).digest('hex');
    return signatures.some((candidate) => {
      try {
        return timingSafeEqual(Buffer.from(candidate, 'utf8'), Buffer.from(expected, 'utf8'));
      } catch {
        return false;
      }
    });
  }

  private async request(path: string, init: { method: 'GET' | 'POST'; body?: URLSearchParams }) {
    const response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: init.body,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('PAYMENT_PROVIDER_ERROR');
    return (await response.json()) as Record<string, unknown>;
  }

  private mapStatus(status: string): PaymentTransaction['status'] {
    if (status === 'succeeded') return 'completed';
    if (status === 'canceled') return 'failed';
    return 'pending';
  }
}

/**
 * Square payment provider
 * TODO: Implement full Square integration
 * Requires: PAYMENT_API_KEY with Square access token
 */
class SquarePaymentProvider implements IPaymentProvider {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async processPayment(
    _amount: number,
    _currency: string,
    _customerId: string,
    _description?: string,
    _metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // TODO: Implement Square payment creation
    // TODO: Handle Square API responses
    // TODO: Return Square transaction ID
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  async refund(_transactionId: string, _amount?: number): Promise<RefundResult> {
    // TODO: Implement Square refund
    // TODO: Handle Square refund API
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  async checkBalance(): Promise<BalanceInfo> {
    // TODO: Implement Square balance check
    // TODO: Use Square's settlement API
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  verifyWebhookSignature(_signature: string, _body: string): boolean {
    // TODO: Implement Square webhook signature verification
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }
}

/**
 * Factory function to create payment provider based on environment configuration
 *
 * Configuration:
 * - PAYMENT_PROVIDER_TYPE: 'mock' (default), 'stripe', 'square'
 * - PAYMENT_API_KEY: API key for provider (required for stripe/square)
 * - PAYMENT_WEBHOOK_SECRET: Webhook secret for signature verification
 *
 * Environment Variable Safety:
 * - Never hardcode API keys in this file
 * - Always load from environment variables
 * - Validate that keys are provided before instantiating real providers
 * - Log warnings if production provider used without key
 *
 * @returns Configured payment provider instance
 * @throws Error if real provider selected but no API key provided
 */
export function createPaymentAdapter(): IPaymentProvider {
  const providerType = (process.env.PAYMENT_PROVIDER_TYPE || 'mock').toLowerCase();
  const apiKey = process.env.PAYMENT_API_KEY || '';
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || '';

  if (process.env.NODE_ENV === 'production' && (providerType === 'mock' || providerType === 'null')) {
    throw new CredentialNotConfiguredError('PAYMENT_PROVIDER_TYPE');
  }

  switch (providerType) {
    case 'stripe':
      if (!apiKey) {
        throw new CredentialNotConfiguredError('PAYMENT_API_KEY');
      }
      if (isLiveStripeCredential(apiKey)) throw new LiveModeNotApprovedError();
      return new StripePaymentProvider(apiKey, webhookSecret);

    case 'square':
      if (!apiKey) {
        throw new CredentialNotConfiguredError('PAYMENT_API_KEY');
      }
      return new SquarePaymentProvider(apiKey, webhookSecret);

    case 'mock':
    case 'null':
    default:
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`PAYMENT_PROVIDER_UNSUPPORTED:${providerType}`);
      }
      // Default to mock for development
      if (providerType !== 'mock' && providerType !== 'null') {
        console.warn(
          `Unknown payment provider type: ${providerType}. Defaulting to mock provider`
        );
      }
      return new MockPaymentProvider();
  }
}

// Singleton instance
let paymentAdapter: IPaymentProvider | null = null;

/**
 * Get or create the payment provider singleton
 * @returns Payment provider instance
 */
export function getPaymentAdapter(): IPaymentProvider {
  if (!paymentAdapter) {
    paymentAdapter = createPaymentAdapter();
  }
  return paymentAdapter;
}
