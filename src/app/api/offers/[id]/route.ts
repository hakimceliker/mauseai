import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth/mock-auth';
import { OfferRepository } from '@/src/lib/db/offer-repository';
import { z } from 'zod';

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'archived']),
});

/**
 * GET /api/offers/:id
 * Get a specific offer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);

    const offer = await OfferRepository.getOffer(params.id, auth.tenantId);

    if (!offer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Offer not found',
        },
        { status: 404 }
      );
    }

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

/**
 * PUT /api/offers/:id
 * Update offer status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request);

    const body = await request.json();
    const validation = UpdateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request: ${validation.error.message}`,
        },
        { status: 400 }
      );
    }

    const offer = await OfferRepository.updateOfferStatus(params.id, auth.tenantId, validation.data.status);

    if (!offer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Offer not found',
        },
        { status: 404 }
      );
    }

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
