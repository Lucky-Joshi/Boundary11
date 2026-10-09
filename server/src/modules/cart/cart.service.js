import { computeTotals } from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateId } from '../../utils/ids.js';

/** Resolve the cart id from the request, generating a fresh one if absent. */
export function resolveCartId(req, { create = false } = {}) {
  const id =
    req.get('x-cart-id') ||
    req.query?.cartId ||
    req.body?.cartId ||
    (create ? generateId('cart') : null);
  if (!id) throw ApiError.badRequest('A cart id is required.', { cartId: 'Missing cart id.' });
  return String(id);
}

function attachTotals(cart, couponCode) {
  const provider = getProvider();
  const coupon = couponCode ? provider.getCouponByCode(couponCode) : null;
  const usable = coupon && coupon.active ? coupon : null;
  const totals = computeTotals(
    cart.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })),
    { coupon: usable },
  );
  return {
    ...cart,
    totals,
    coupon: totals.discountPaise > 0 ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
  };
}

export function getCart(req) {
  const cartId = resolveCartId(req, { create: true });
  const cart = getProvider().getCart(cartId);
  return { cartId, ...attachTotals(cart, req.query?.coupon) };
}

export function addItem(req) {
  const cartId = resolveCartId(req, { create: true });
  const { variantId, quantity } = req.body;
  const cart = getProvider().addCartItem(cartId, variantId, quantity);
  return { cartId, ...attachTotals(cart) };
}

export function updateItem(req) {
  const cartId = resolveCartId(req);
  const cart = getProvider().updateCartItem(cartId, req.params.itemId, req.body.quantity);
  return { cartId, ...attachTotals(cart) };
}

export function removeItem(req) {
  const cartId = resolveCartId(req);
  const cart = getProvider().removeCartItem(cartId, req.params.itemId);
  return { cartId, ...attachTotals(cart) };
}

export function clearCart(req) {
  const cartId = resolveCartId(req);
  const cart = getProvider().clearCart(cartId);
  return { cartId, ...attachTotals(cart) };
}
