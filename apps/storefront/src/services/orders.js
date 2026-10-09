import { api } from './api.js';

export function checkout(payload) {
  return api.post('/checkout', payload);
}

export function verifyMockPayment(orderId, outcome) {
  return api.post('/payments/verify', { orderId, outcome });
}

export function fetchOrders() {
  return api.get('/orders');
}

export function fetchOrder(id) {
  return api.get(`/orders/${id}`);
}

export function sendContactMessage(payload) {
  return api.post('/contact', payload);
}

export function subscribeNewsletter(email) {
  return api.post('/newsletter', { email });
}
