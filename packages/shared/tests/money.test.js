import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  multiplyPaise,
  applyPercentDiscount,
  computeCouponDiscount,
  formatINR,
} from '../money/index.js';

describe('money', () => {
  it('converts rupees to integer paise', () => {
    expect(rupeesToPaise(1499)).toBe(149900);
    expect(rupeesToPaise(99.99)).toBe(9999);
  });

  it('converts paise back to rupees', () => {
    expect(paiseToRupees(149900)).toBe(1499);
  });

  it('rejects non-integer paise', () => {
    expect(() => paiseToRupees(10.5)).toThrow();
  });

  it('multiplies paise by quantity', () => {
    expect(multiplyPaise(49900, 3)).toBe(149700);
  });

  it('applies percentage discounts with rounding', () => {
    expect(applyPercentDiscount(100000, 10)).toBe(90000);
    expect(applyPercentDiscount(999, 33)).toBe(669);
  });

  it('formats Indian currency', () => {
    expect(formatINR(149900)).toContain('1,499');
  });

  describe('computeCouponDiscount', () => {
    const percentCoupon = { type: 'percent', value: 10, active: true, minSubtotalPaise: 100000 };
    const fixedCoupon = { type: 'fixed', value: 20000, active: true };

    it('applies a percent coupon above minimum', () => {
      const result = computeCouponDiscount(200000, percentCoupon);
      expect(result.qualifies).toBe(true);
      expect(result.discountPaise).toBe(20000);
    });

    it('rejects a coupon below its minimum', () => {
      const result = computeCouponDiscount(50000, percentCoupon);
      expect(result.qualifies).toBe(false);
      expect(result.reason).toBe('below_minimum');
      expect(result.discountPaise).toBe(0);
    });

    it('caps a percent coupon at max discount', () => {
      const capped = { ...percentCoupon, maxDiscountPaise: 15000 };
      expect(computeCouponDiscount(500000, capped).discountPaise).toBe(15000);
    });

    it('never discounts a fixed coupon below zero', () => {
      expect(computeCouponDiscount(10000, fixedCoupon).discountPaise).toBe(10000);
    });

    it('rejects an inactive coupon', () => {
      expect(computeCouponDiscount(200000, { ...percentCoupon, active: false }).qualifies).toBe(false);
    });
  });
});
