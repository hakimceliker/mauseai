import { NextResponse } from 'next/server';
import { getPaymentAdapter } from '@/src/lib/integrations';
import { WalletRepository } from '@/src/lib/wallet/wallet-repository';

/**
 * Stripe webhook ingress. The raw body is required for signature validation;
 * card data is never parsed or persisted by MouseAI.
 */
export async function POST(request: Request) {
  if ((process.env.PAYMENT_PROVIDER_TYPE ?? 'mock').toLowerCase() !== 'stripe') {
    return NextResponse.json({ error: 'payment_provider_not_configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  const body = await request.text();
  if (!signature || !body) return NextResponse.json({ error: 'invalid_webhook' }, { status: 400 });

  try {
    const adapter = getPaymentAdapter();
    if (!adapter.verifyWebhookSignature(signature, body)) {
      return NextResponse.json({ error: 'invalid_webhook_signature' }, { status: 400 });
    }

    const event = JSON.parse(body) as {
      id?: string;
      type?: string;
      livemode?: boolean;
      data?: { object?: { amount_received?: number; amount?: number; metadata?: Record<string, string>; currency?: string } };
    };
    if (event.livemode === true) {
      return NextResponse.json({ error: 'live_mode_not_approved' }, { status: 403 });
    }
    const object = event.data?.object;
    const tenantId = object?.metadata?.tenant_id;
    const amountCents = Number(object?.amount_received ?? object?.amount ?? 0);
    if (!event.id || !tenantId || !Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ received: true, ignored: true }, { status: 200 });
    }

    if (event.type === 'payment_intent.succeeded' || event.type === 'checkout.session.completed') {
      await WalletRepository.postEntry({
        tenantId,
        entryType: 'credit',
        amountCents,
        source: 'stripe_webhook',
        idempotencyKey: `stripe:${event.id}`,
        externalId: event.id,
        metadata: { event_type: event.type, currency: object?.currency ?? 'usd' },
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    // Do not expose provider or database details to the webhook caller.
    return NextResponse.json({ error: 'webhook_processing_failed' }, { status: 500 });
  }
}
