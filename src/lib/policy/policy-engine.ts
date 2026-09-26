import { Offer } from '@/src/lib/db/offer-repository';

export interface PolicyValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Policy engine for validating offers against business rules
 */
export class PolicyEngine {
  // Business rule: max discount is 20%
  private static readonly MAX_DISCOUNT_PERCENT = 20;

  /**
   * Validate an offer against all policies
   */
  static evaluate(offer: Offer, basePrice: number): PolicyValidation {
    // Rule 1: discount must be <= 20%
    if (offer.discount_percent > this.MAX_DISCOUNT_PERCENT) {
      return {
        valid: false,
        reason: `Discount ${offer.discount_percent}% exceeds maximum allowed ${this.MAX_DISCOUNT_PERCENT}%`,
      };
    }

    // Rule 2: price_cap must be >= base_price
    // (price_cap is the maximum price after discount)
    if (offer.price_cap < basePrice) {
      return {
        valid: false,
        reason: `Price cap ${offer.price_cap} is less than base price ${basePrice}`,
      };
    }

    // All policies passed
    return {
      valid: true,
    };
  }

  /**
   * Calculate discounted price
   */
  static calculateDiscountedPrice(basePrice: number, discountPercent: number): number {
    return basePrice * (1 - discountPercent / 100);
  }

  /**
   * Validate discount percent
   */
  static isValidDiscount(discountPercent: number): boolean {
    return discountPercent >= 0 && discountPercent <= this.MAX_DISCOUNT_PERCENT;
  }

  /**
   * Validate price cap
   */
  static isValidPriceCap(priceCap: number, basePrice: number): boolean {
    return priceCap >= basePrice;
  }
}
