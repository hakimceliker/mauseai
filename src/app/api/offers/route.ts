import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync } from '@/src/lib/auth/mock-auth';
import { OfferRepository } from '@/src/lib/db/offer-repository';
import { PolicyEngine } from '@/src/lib/policy/policy-engine';
import { z } from 'zod';
import {
  ApiErrorHandler,
  AuthError,
  ValidationError,
} from '@/src/lib/errors/api-error-handler';
import { addSecurityHeaders } from '@/src/lib/middleware/security-headers';

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
    const auth = await requireAuthAsync(request);

    const body = await request.json();
    const validation = CreateOfferSchema.safeParse(body);

    if (!validation.success) {
      throw new ValidationError(validation.error.flatten());
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
      throw new ValidationError({ reason: policyCheck.reason });
    }

    // Create offer
    const offer = await OfferRepository.createOffer(
      auth.tenantId,
      template_id,
      discount_percent,
      price_cap,
      'draft'
    );

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
      { status: 201 }
    );

    addSecurityHeaders(result);
    return result;
  } catch (error) {
    if (error instanceof AuthError) {
      return ApiErrorHandler.handle(error, {
        requestPath: request.nextUrl.pathname,
        method: 'POST',
      });
    }

    return ApiErrorHandler.handle(error, {
      requestPath: request.nextUrl.pathname,
      method: 'POST',
    });
  }
}

/**
 * GET /api/offers
 * List offers for tenant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthAsync(request);
    const status = request.nextUrl.searchParams.get('status');

    const offers = await OfferRepository.getTenantOffers(
      auth.tenantId,
      (status as 'draft' | 'active' | 'archived' | null) || undefined
    );

    const result = NextResponse.json(
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
