import { api } from './api.js';

export function fetchCart(couponCode) {
  const suffix = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : '';
  return api.get(`/cart${suffix}`);
}

export function addCartItem(variantId, quantity = 1) {
  return api.post('/cart/items', { variantId, quantity });
}

export function updateCartItem(itemId, quantity) {
  return api.patch(`/cart/items/${itemId}`, { quantity });
}

export function removeCartItem(itemId) {
  return api.del(`/cart/items/${itemId}`);
}

export function clearCart() {
  return api.del('/cart');
}
