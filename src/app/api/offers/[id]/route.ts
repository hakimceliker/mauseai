import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { OfferRepository } from '@/src/lib/db/offer-repository';
import { z } from 'zod';
import {
  ApiErrorHandler,
  AuthError,
  NotFoundError,
  ValidationError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

const UpdateStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'archived']),
});

/**
 * GET /api/offers/:id
 * Get a specific offer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuthAsync(request);

    const offer = await OfferRepository.getOffer(id, auth.tenantId);

    if (!offer) {
      throw new NotFoundError({ resource: 'offer', id });
    }

    const result = NextResponse.json(
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

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'GET',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'GET',
    });
  }
}

/**
 * PUT /api/offers/:id
 * Update offer status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuthAsync(request);

    const body = await request.json();
    const validation = UpdateStatusSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(validation.error.flatten());
    }

    const offer = await OfferRepository.updateOfferStatus(id, auth.tenantId, validation.data.status);

    if (!offer) {
      throw new NotFoundError({ resource: 'offer', id });
    }

    const result = NextResponse.json(
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

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'PUT',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'PUT',
    });
  }
}
