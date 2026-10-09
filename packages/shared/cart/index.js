import { multiplyPaise, computeCouponDiscount } from '../money/index.js';

/** Free shipping threshold and flat fee, in paise. */
export const FREE_SHIPPING_THRESHOLD_PAISE = 199900; // ₹1,999
export const FLAT_SHIPPING_PAISE = 9900; // ₹99
export const MAX_QUANTITY_PER_LINE = 10;

/**
 * Pure cart operations. The server is the source of truth for prices and
 * stock; these helpers keep the client and server behaviour identical and are
 * covered by unit tests.
 */

export function lineTotalPaise(item) {
  return multiplyPaise(item.unitPrice, item.quantity);
}

export function shippingForSubtotal(subtotalPaise) {
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : FLAT_SHIPPING_PAISE;
}

/**
 * Validate whether a quantity is acceptable for a variant given its stock.
 * Returns { ok, reason }.
 */
export function validateQuantity(quantity, stock) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: 'Quantity must be at least 1.' };
  }
  if (quantity > MAX_QUANTITY_PER_LINE) {
    return { ok: false, reason: `You can order at most ${MAX_QUANTITY_PER_LINE} of this item.` };
  }
  if (typeof stock === 'number' && quantity > stock) {
    return { ok: false, reason: `Only ${stock} left in stock.` };
  }
  return { ok: true, reason: null };
}

/**
 * Add a variant to a cart, merging quantities when the variant already exists.
 * Throws when the requested quantity exceeds available stock.
 */
export function addItem(items, newItem) {
  const existing = items.find((item) => item.variantId === newItem.variantId);
  if (existing) {
    const nextQuantity = existing.quantity + newItem.quantity;
    const check = validateQuantity(nextQuantity, existing.stock);
    if (!check.ok) throw new Error(check.reason);
    return items.map((item) =>
      item.variantId === newItem.variantId ? { ...item, quantity: nextQuantity } : item,
    );
  }
  const check = validateQuantity(newItem.quantity, newItem.stock);
  if (!check.ok) throw new Error(check.reason);
  return [...items, newItem];
}

export function updateItemQuantity(items, variantId, quantity) {
  const item = items.find((i) => i.variantId === variantId);
  if (!item) throw new Error('Cart item not found.');
  const check = validateQuantity(quantity, item.stock);
  if (!check.ok) throw new Error(check.reason);
  return items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i));
}

export function removeItem(items, variantId) {
  return items.filter((item) => item.variantId !== variantId);
}

export function countItems(items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Compute the authoritative order totals for a set of cart items and an
 * optional coupon. Mirrors the server's checkout calculation.
 */
export function computeTotals(items, { coupon = null } = {}) {
  const subtotalPaise = items.reduce((sum, item) => sum + lineTotalPaise(item), 0);
  const { discountPaise, qualifies, reason } = computeCouponDiscount(subtotalPaise, coupon);
  const discountedSubtotal = subtotalPaise - discountPaise;
  const shippingPaise = shippingForSubtotal(discountedSubtotal);
  const totalPaise = discountedSubtotal + shippingPaise;
  return {
    itemCount: countItems(items),
    subtotalPaise,
    discountPaise,
    shippingPaise,
    totalPaise,
    couponQualifies: qualifies,
    couponReason: reason,
  };
}
