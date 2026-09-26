import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { OfferRepository } from '@/src/lib/db/offer-repository';
import { PolicyEngine } from '@/src/lib/policy/policy-engine';
import { z } from 'zod';

const CreateOfferSchema = z.object({
  template_id: z.string().min(1),
  discount_percent: z.number().min(0).max(100),
  price_cap: z.number().min(0),
  base_price: z.number().min(0), // For policy validation
});

/**
 * POST /api/offers
 * Create a new offer with policy validation
 */
export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);

    const body = await request.json();
    const validation = CreateOfferSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validation.error.message}`,
        },
        { status: 400 }
      );
    }

    const { template_id, discount_percent, price_cap, base_price } = validation.data;

    // Validate offer against policies
    const policyCheck = PolicyEngine.evaluate(
      {
        id: '', // Not needed for validation
        tenant_id: auth.tenantId,
        template_id,
        discount_percent,
        price_cap,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      },
      base_price
    );

    if (!policyCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Policy validation failed: ${policyCheck.reason}`,
        },
        { status: 400 }
      );
    }

    // Create offer
    const offer = await OfferRepository.createOffer(
      auth.tenantId,
      template_id,
      discount_percent,
      price_cap,
      'draft'
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: offer.id,
          tenant_id: offer.tenant_id,
          template_id: offer.template_id,
          discount_percent: offer.discount_percent,
          price_cap: offer.price_cap,
          status: offer.status,
          created_at: offer.created_at.toISOString(),
          updated_at: offer.updated_at.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}

/**
 * GET /api/offers
 * List offers for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    const status = request.nextUrl.searchParams.get('status');

    const offers = await OfferRepository.getTenantOffers(
      auth.tenantId,
      (status as any) || undefined
    );

    return NextResponse.json(
      {
        success: true,
        data: offers.map(o => ({
          id: o.id,
          tenant_id: o.tenant_id,
          template_id: o.template_id,
          discount_percent: o.discount_percent,
          price_cap: o.price_cap,
          status: o.status,
          created_at: o.created_at.toISOString(),
          updated_at: o.updated_at.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
