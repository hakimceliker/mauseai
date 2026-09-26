import * as Domain from '@/src/types/domain';
import { getSupabaseAdmin } from './supabase';

export interface Offer {
  id: string;
  tenant_id: Domain.TenantId;
  template_id: string;
  discount_percent: number;
  price_cap: number;
  status: 'draft' | 'active' | 'archived';
  created_at: Date;
  updated_at: Date;
}

/**
 * Offer repository for managing discount offers
 */
export class OfferRepository {
  /**
   * Create a new offer
   */
  static async createOffer(
    tenantId: Domain.TenantId,
    templateId: string,
    discountPercent: number,
    priceCap: number,
    status: 'draft' | 'active' | 'archived' = 'draft'
  ): Promise<Offer> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('offers')
      .insert({
        tenant_id: tenantId,
        template_id: templateId,
        discount_percent: discountPercent,
        price_cap: priceCap,
        status,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create offer: ${error.message}`);
    }

    return this.formatOffer(data);
  }

  /**
   * Get an offer by ID (tenant isolation)
   */
  static async getOffer(offerId: string, tenantId: Domain.TenantId): Promise<Offer | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('offers')
      .select()
      .eq('id', offerId)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get offer: ${error.message}`);
    }

    return data ? this.formatOffer(data) : null;
  }

  /**
   * Update offer status
   */
  static async updateOfferStatus(
    offerId: string,
    tenantId: Domain.TenantId,
    status: 'draft' | 'active' | 'archived'
  ): Promise<Offer | null> {
    const db = getSupabaseAdmin();

    const { data, error } = await db
      .from('offers')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update offer status: ${error.message}`);
    }

    return data ? this.formatOffer(data) : null;
  }

  /**
   * Get tenant offers by status
   */
  static async getTenantOffers(
    tenantId: Domain.TenantId,
    status?: 'draft' | 'active' | 'archived'
  ): Promise<Offer[]> {
    const db = getSupabaseAdmin();

    let query = db.from('offers').select().eq('tenant_id', tenantId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get tenant offers: ${error.message}`);
    }

    return data.map(o => this.formatOffer(o));
  }

  /**
   * Format database offer to domain model
   */
  private static formatOffer(data: Record<string, unknown>): Offer {
    return {
      id: data.id as string,
      tenant_id: data.tenant_id as Domain.TenantId,
      template_id: data.template_id as string,
      discount_percent: Number(data.discount_percent),
      price_cap: Number(data.price_cap),
      status: data.status as 'draft' | 'active' | 'archived',
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}
