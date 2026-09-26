import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '@/src/lib/policy/policy-engine';
import { Offer } from '@/src/lib/db/offer-repository';
import * as Domain from '@/src/types/domain';

describe('PolicyEngine', () => {
  const baseTenantId = 'tenant-1' as Domain.TenantId;

  describe('evaluate', () => {
    it('should validate a valid offer', () => {
      const offer: Offer = {
        id: 'offer-1',
        tenant_id: baseTenantId,
        template_id: 'template-1',
        discount_percent: 10,
        price_cap: 100,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(offer, 90);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject offer with discount > 20%', () => {
      const offer: Offer = {
        id: 'offer-1',
        tenant_id: baseTenantId,
        template_id: 'template-1',
        discount_percent: 25,
        price_cap: 100,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(offer, 90);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });

    it('should reject offer with price_cap < base_price', () => {
      const offer: Offer = {
        id: 'offer-1',
        tenant_id: baseTenantId,
        template_id: 'template-1',
        discount_percent: 10,
        price_cap: 80,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(offer, 100);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Price cap');
    });

    it('should accept offer at boundary values', () => {
      const offer: Offer = {
        id: 'offer-1',
        tenant_id: baseTenantId,
        template_id: 'template-1',
        discount_percent: 20, // Max allowed
        price_cap: 100, // Equal to base price
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = PolicyEngine.evaluate(offer, 100);

      expect(result.valid).toBe(true);
    });
  });

  describe('calculateDiscountedPrice', () => {
    it('should calculate discounted price correctly', () => {
      const price = PolicyEngine.calculateDiscountedPrice(100, 20);
      expect(price).toBe(80);
    });

    it('should handle 0% discount', () => {
      const price = PolicyEngine.calculateDiscountedPrice(100, 0);
      expect(price).toBe(100);
    });
  });

  describe('isValidDiscount', () => {
    it('should accept valid discounts', () => {
      expect(PolicyEngine.isValidDiscount(0)).toBe(true);
      expect(PolicyEngine.isValidDiscount(10)).toBe(true);
      expect(PolicyEngine.isValidDiscount(20)).toBe(true);
    });

    it('should reject invalid discounts', () => {
      expect(PolicyEngine.isValidDiscount(-1)).toBe(false);
      expect(PolicyEngine.isValidDiscount(21)).toBe(false);
      expect(PolicyEngine.isValidDiscount(100)).toBe(false);
    });
  });

  describe('isValidPriceCap', () => {
    it('should accept price_cap >= base_price', () => {
      expect(PolicyEngine.isValidPriceCap(100, 100)).toBe(true);
      expect(PolicyEngine.isValidPriceCap(150, 100)).toBe(true);
    });

    it('should reject price_cap < base_price', () => {
      expect(PolicyEngine.isValidPriceCap(50, 100)).toBe(false);
    });
  });
});
