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

async function attachTotals(cart, couponCode) {
  const provider = getProvider();
  const coupon = couponCode ? await provider.getCouponByCode(couponCode) : null;
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

export async function getCart(req) {
  const cartId = resolveCartId(req, { create: true });
  const cart = await getProvider().getCart(cartId);
  return { cartId, ...(await attachTotals(cart, req.query?.coupon)) };
}

export async function addItem(req) {
  const cartId = resolveCartId(req, { create: true });
  const { variantId, quantity } = req.body;
  const cart = await getProvider().addCartItem(cartId, variantId, quantity);
  return { cartId, ...(await attachTotals(cart)) };
}

export async function updateItem(req) {
  const cartId = resolveCartId(req);
  const cart = await getProvider().updateCartItem(cartId, req.params.itemId, req.body.quantity);
  return { cartId, ...(await attachTotals(cart)) };
}

export async function removeItem(req) {
  const cartId = resolveCartId(req);
  const cart = await getProvider().removeCartItem(cartId, req.params.itemId);
  return { cartId, ...(await attachTotals(cart)) };
}

export async function clearCart(req) {
  const cartId = resolveCartId(req);
  const cart = await getProvider().clearCart(cartId);
  return { cartId, ...(await attachTotals(cart)) };
}
