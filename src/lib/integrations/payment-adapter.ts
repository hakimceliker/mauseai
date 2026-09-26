import {
  IPaymentProvider,
  PaymentTransaction,
  RefundResult,
  BalanceInfo,
} from './payment-provider';

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

  verifyWebhookSignature(signature: string, body: string): boolean {
    // Mock always returns true for development
    console.log('[MOCK] Verifying webhook signature');
    return true;
  }
}

/**
 * Stripe payment provider
 * TODO: Implement full Stripe integration
 * Requires: PAYMENT_API_KEY with Stripe secret key
 */
class StripePaymentProvider implements IPaymentProvider {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
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
    // TODO: Implement Stripe charge creation
    // TODO: Handle Stripe errors and convert to standard format
    // TODO: Return Stripe transaction ID
    throw new Error('Stripe payment provider not configured. Set PAYMENT_API_KEY');
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    // TODO: Implement Stripe refund
    // TODO: Handle full and partial refunds
    // TODO: Return refund details
    throw new Error('Stripe payment provider not configured. Set PAYMENT_API_KEY');
  }

  async checkBalance(): Promise<BalanceInfo> {
    // TODO: Implement Stripe balance check
    // TODO: Use Stripe Balance API
    throw new Error('Stripe payment provider not configured. Set PAYMENT_API_KEY');
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
    // TODO: Implement Stripe webhook signature verification
    // TODO: Use Stripe's hmac-sha256 verification
    throw new Error('Stripe payment provider not configured. Set PAYMENT_API_KEY');
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
    amount: number,
    currency: string,
    customerId: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    // TODO: Implement Square payment creation
    // TODO: Handle Square API responses
    // TODO: Return Square transaction ID
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  async refund(transactionId: string, amount?: number): Promise<RefundResult> {
    // TODO: Implement Square refund
    // TODO: Handle Square refund API
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  async checkBalance(): Promise<BalanceInfo> {
    // TODO: Implement Square balance check
    // TODO: Use Square's settlement API
    throw new Error('Square payment provider not configured. Set PAYMENT_API_KEY');
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
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

  switch (providerType) {
    case 'stripe':
      if (!apiKey) {
        console.error(
          'Stripe payment provider selected but PAYMENT_API_KEY not set. ' +
          'Add to .env.local (never commit to git)'
        );
        throw new Error('Stripe provider requires PAYMENT_API_KEY environment variable');
      }
      return new StripePaymentProvider(apiKey, webhookSecret);

    case 'square':
      if (!apiKey) {
        console.error(
          'Square payment provider selected but PAYMENT_API_KEY not set. ' +
          'Add to .env.local (never commit to git)'
        );
        throw new Error('Square provider requires PAYMENT_API_KEY environment variable');
      }
      return new SquarePaymentProvider(apiKey, webhookSecret);

    case 'mock':
    case 'null':
    default:
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
