/**
 * Abstract interface for payment providers
 * Implementations: Stripe, Square, Mock
 *
 * Configuration via environment variables:
 * - PAYMENT_PROVIDER_TYPE: Type of payment provider (stripe, square, null/mock)
 * - PAYMENT_API_KEY: API key for the provider (from .env.local)
 * - PAYMENT_WEBHOOK_SECRET: Webhook secret for validating webhooks
 */

export interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  customerId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  originalTransactionId: string;
}

export interface BalanceInfo {
  available: number;
  pending: number;
  currency: string;
}

/**
 * Abstract payment provider interface
 * TODO: Implement concrete providers (Stripe, Square)
 * TODO: Add webhook handling for payment updates
 * TODO: Add retry logic for failed transactions
 */
export interface IPaymentProvider {
  /**
   * Process a payment transaction
   * @param amount Amount in cents
   * @param currency Currency code (e.g., 'USD')
   * @param customerId Unique customer identifier
   * @param description Transaction description
   * @param metadata Additional metadata
   * @returns Transaction result with ID and status
   *
   * TODO: Implement with selected provider
   * TODO: Handle PCI compliance requirements
   * TODO: Implement idempotency for duplicate prevention
   */
  processPayment(
    amount: number,
    currency: string,
    customerId: string,
    description?: string,
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction>;

  /**
   * Refund a previous transaction
   * @param transactionId Original transaction ID
   * @param amount Amount to refund (partial refund if less than original)
   * @returns Refund result with status
   *
   * TODO: Implement with selected provider
   * TODO: Validate refund amount doesn't exceed original
   * TODO: Handle partial refunds
   */
  refund(transactionId: string, amount?: number): Promise<RefundResult>;

  /**
   * Check account balance
   * @returns Available and pending balance
   *
   * TODO: Implement with selected provider
   * TODO: Cache balance with TTL for performance
   * TODO: Return balance breakdown (available, pending, reserved)
   */
  checkBalance(): Promise<BalanceInfo>;

  /**
   * Verify webhook signature for incoming payment events
   * @param signature Webhook signature header
   * @param body Raw webhook body
   * @returns true if signature is valid
   *
   * TODO: Implement provider-specific verification
   * TODO: Prevent replay attacks
   * TODO: Log all webhook verification attempts
   */
  verifyWebhookSignature(signature: string, body: string): boolean;
}
