/**
 * Money helpers.
 *
 * All authoritative monetary values are stored and computed as integer paise
 * (1 rupee = 100 paise). Floating point is never used for money.
 */

export const PAISE_PER_RUPEE = 100;

export function rupeesToPaise(rupees) {
  if (typeof rupees !== 'number' || Number.isNaN(rupees)) {
    throw new TypeError('rupeesToPaise expects a number');
  }
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function paiseToRupees(paise) {
  assertPaise(paise);
  return paise / PAISE_PER_RUPEE;
}

export function assertPaise(value) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Money value must be an integer number of paise, received: ${value}`);
  }
  return true;
}

/** Multiply an integer paise amount by an integer quantity. */
export function multiplyPaise(paise, quantity) {
  assertPaise(paise);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new TypeError(`Quantity must be a non-negative integer, received: ${quantity}`);
  }
  return paise * quantity;
}

/** Apply a whole-number percentage discount to a paise amount. */
export function applyPercentDiscount(paise, percent) {
  assertPaise(paise);
  if (percent < 0 || percent > 100) {
    throw new RangeError('percent must be between 0 and 100');
  }
  return Math.round((paise * (100 - percent)) / 100);
}

/** Standard Indian-format currency string, e.g. "₹1,499.00". */
export function formatINR(paise, { withDecimals = true } = {}) {
  if (!Number.isFinite(paise)) return '₹—';
  const rupees = paise / PAISE_PER_RUPEE;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(rupees);
}

/**
 * Compute a discount for a cart subtotal given a coupon definition.
 * Returns { discountPaise, qualifies, reason }.
 */
export function computeCouponDiscount(subtotalPaise, coupon) {
  if (!coupon || !coupon.active) {
    return { discountPaise: 0, qualifies: false, reason: 'invalid' };
  }
  if (coupon.minSubtotalPaise && subtotalPaise < coupon.minSubtotalPaise) {
    return { discountPaise: 0, qualifies: false, reason: 'below_minimum' };
  }
  let discount = 0;
  if (coupon.type === 'percent') {
    discount = applyPercentDiscount(subtotalPaise, coupon.value);
    if (coupon.maxDiscountPaise) {
      discount = Math.min(discount, coupon.maxDiscountPaise);
    }
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, subtotalPaise);
  } else {
    return { discountPaise: 0, qualifies: false, reason: 'invalid' };
  }
  return { discountPaise: discount, qualifies: true, reason: 'ok' };
}
