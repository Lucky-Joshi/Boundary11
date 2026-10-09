import { describe, it, expect } from 'vitest';
import {
  checkoutSchema,
  productInputSchema,
  inventoryAdjustmentSchema,
  couponInputSchema,
  orderStatusUpdateSchema,
  formatZodError,
} from '../validation/index.js';
import { canTransitionOrderStatus } from '../constants/index.js';

const validCheckout = {
  contactEmail: 'fan@example.com',
  contactPhone: '+91 9876543210',
  shippingAddress: {
    fullName: 'Rohit Fan',
    phone: '9876543210',
    line1: '12 Stadium Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
  },
  paymentMethod: 'mock_upi',
};

describe('validation', () => {
  it('accepts a valid checkout payload', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
  });

  it('rejects an invalid PIN code', () => {
    const bad = { ...validCheckout, shippingAddress: { ...validCheckout.shippingAddress, postalCode: '123' } };
    const result = checkoutSchema.safeParse(bad);
    expect(result.success).toBe(false);
    expect(formatZodError(result.error)['shippingAddress.postalCode']).toMatch(/PIN/);
  });

  it('requires at least one product variant', () => {
    const result = productInputSchema.safeParse({
      name: 'Test Product',
      description: 'A description that is definitely long enough.',
      categorySlug: 'caps',
      variants: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = productInputSchema.safeParse({
      name: 'Test Product',
      description: 'A description that is definitely long enough.',
      categorySlug: 'caps',
      variants: [{ sku: 'X-1', size: 'M', color: 'Blue', pricePaise: 1000, stock: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a zero inventory adjustment', () => {
    expect(inventoryAdjustmentSchema.safeParse({ variantId: 'v1', delta: 0, reason: 'restock' }).success).toBe(false);
  });

  it('uppercases coupon codes', () => {
    const result = couponInputSchema.safeParse({ code: 'boundary10', type: 'percent', value: 10 });
    expect(result.success).toBe(true);
    expect(result.data.code).toBe('BOUNDARY10');
  });

  it('validates order status values', () => {
    expect(orderStatusUpdateSchema.safeParse({ status: 'shipped' }).success).toBe(true);
    expect(orderStatusUpdateSchema.safeParse({ status: 'teleported' }).success).toBe(false);
  });
});

describe('order status transitions', () => {
  it('allows valid transitions', () => {
    expect(canTransitionOrderStatus('paid', 'processing')).toBe(true);
    expect(canTransitionOrderStatus('shipped', 'delivered')).toBe(true);
  });
  it('blocks invalid transitions', () => {
    expect(canTransitionOrderStatus('delivered', 'pending')).toBe(false);
    expect(canTransitionOrderStatus('cancelled', 'paid')).toBe(false);
  });
});
