import { describe, it, expect } from 'vitest';
import {
  addItem,
  updateItemQuantity,
  removeItem,
  computeTotals,
  validateQuantity,
  shippingForSubtotal,
  FREE_SHIPPING_THRESHOLD_PAISE,
  FLAT_SHIPPING_PAISE,
} from '../cart/index.js';

const jersey = {
  variantId: 'v-jersey-m',
  productId: 'p-jersey',
  name: 'Boundary11 Home Jersey',
  unitPrice: 149900,
  quantity: 1,
  stock: 8,
};
const cap = {
  variantId: 'v-cap-os',
  productId: 'p-cap',
  name: 'Boundary11 Field Cap',
  unitPrice: 99900,
  quantity: 1,
  stock: 3,
};

describe('cart', () => {
  it('adds a new item', () => {
    const items = addItem([], jersey);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
  });

  it('merges quantity for an existing variant', () => {
    const items = addItem([jersey], { ...jersey, quantity: 2 });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('rejects adding beyond available stock', () => {
    expect(() => addItem([jersey], { ...jersey, quantity: 9 })).toThrow(/Only 8 left/);
  });

  it('updates quantity within stock', () => {
    const items = updateItemQuantity([jersey], jersey.variantId, 4);
    expect(items[0].quantity).toBe(4);
  });

  it('rejects an invalid quantity update', () => {
    expect(() => updateItemQuantity([cap], cap.variantId, 5)).toThrow(/Only 3 left/);
  });

  it('removes an item', () => {
    expect(removeItem([jersey, cap], cap.variantId)).toEqual([jersey]);
  });

  describe('validateQuantity', () => {
    it('flags zero or negative quantities', () => {
      expect(validateQuantity(0, 10).ok).toBe(false);
    });
    it('accepts a valid quantity', () => {
      expect(validateQuantity(2, 10).ok).toBe(true);
    });
  });

  describe('shipping', () => {
    it('is flat below the free threshold', () => {
      expect(shippingForSubtotal(100000)).toBe(FLAT_SHIPPING_PAISE);
    });
    it('is free at/above the threshold', () => {
      expect(shippingForSubtotal(FREE_SHIPPING_THRESHOLD_PAISE)).toBe(0);
    });
    it('is zero for an empty cart', () => {
      expect(shippingForSubtotal(0)).toBe(0);
    });
  });

  describe('computeTotals', () => {
    it('sums line totals and applies flat shipping', () => {
      const items = [
        { ...jersey, quantity: 1 },
        { ...cap, quantity: 1 },
      ];
      const totals = computeTotals(items);
      expect(totals.subtotalPaise).toBe(249800);
      expect(totals.shippingPaise).toBe(0); // above free threshold
      expect(totals.totalPaise).toBe(249800);
      expect(totals.itemCount).toBe(2);
    });

    it('applies a coupon and recomputes shipping on the discounted subtotal', () => {
      const items = [{ ...cap, quantity: 1 }];
      const totals = computeTotals(items, {
        coupon: { type: 'fixed', value: 10000, active: true },
      });
      expect(totals.discountPaise).toBe(10000);
      expect(totals.subtotalPaise).toBe(99900);
      expect(totals.shippingPaise).toBe(FLAT_SHIPPING_PAISE);
      expect(totals.totalPaise).toBe(99900 - 10000 + FLAT_SHIPPING_PAISE);
    });
  });
});
