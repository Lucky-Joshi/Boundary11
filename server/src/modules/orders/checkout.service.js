import { getProvider } from '../../providers/index.js';
import { getPaymentProvider } from '../../payments/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveCartId } from '../cart/cart.service.js';

/**
 * Begin checkout. The server — not the browser — prices the order, checks
 * stock, validates the coupon and decrements inventory before any payment is
 * attempted.
 *
 * DEMO: no money moves. The returned "payment session" is a mock that the
 * client resolves through POST /payments/verify.
 *
 * Idempotency: an `Idempotency-Key` (header) and/or `idempotencyKey` (body)
 * makes retries safe — replaying the same key returns the order created by
 * the first attempt instead of charging twice.
 */
export async function createCheckout(req) {
  const provider = getProvider();
  const cartId = resolveCartId(req);
  const {
    contactEmail,
    contactPhone,
    shippingAddress,
    paymentMethod,
    couponCode,
    notes,
    idempotencyKey,
  } = req.body;

  const idempotency =
    (idempotencyKey && idempotencyKey.trim()) || (req.get('idempotency-key') || '').trim() || null;

  const order = await provider.createOrder({
    cartId,
    contactEmail,
    contactPhone,
    shippingAddress,
    paymentMethod,
    couponCode: couponCode || null,
    notes,
    userId: req.user?.id || null,
    customerName: req.user?.name || shippingAddress.fullName,
    idempotencyKey: idempotency,
  });

  if (paymentMethod === 'cod') {
    const confirmed = await provider.updateOrderStatus(order.id, 'processing', 'Cash on delivery order', 'system');
    return { order: confirmed, payment: { provider: 'mock', method: 'cod', status: 'on_delivery', amountPaise: confirmed.totalPaise } };
  }

  const payments = getPaymentProvider();
  const session = await payments.createCheckoutSession({ order, method: paymentMethod });
  return { order, payment: session };
}

/**
 * Confirm the DEMO payment outcome for an order.
 *
 * DEMO ONLY. In production this endpoint would verify a Razorpay signature
 * server-side; here the mock payment provider decides the outcome so success
 * and failure paths can be exercised end to end.
 */
export async function verifyPayment(req) {
  const provider = getProvider();
  const { orderId, outcome } = req.body;
  const order = await provider.getOrder(orderId);
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.paymentStatus === 'paid') {
    // Idempotent: replaying a demo confirmation does not double-charge.
    return { order, payment: { status: 'already_paid_demo' } };
  }

  const payments = getPaymentProvider();
  const result = await payments.confirmPayment({ order, success: outcome !== 'failure' });

  if (result.status === 'failed') {
    const failed = await provider.markPaymentFailed(order.id);
    return { order: failed, payment: result };
  }

  const paid = await provider.markOrderPaid(order.id, result.reference);
  return { order: paid, payment: { ...result, provider: 'mock', status: 'paid', reference: paid.paymentRef } };
}