import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveCartId } from '../cart/cart.service.js';

/**
 * Begin checkout. The server — not the browser — prices the order, checks
 * stock, validates the coupon and decrements inventory before any payment is
 * attempted.
 *
 * DEMO: no money moves. The returned "payment session" is a mock that the
 * client resolves through POST /payments/verify.
 */
export function createCheckout(req) {
  const provider = getProvider();
  const cartId = resolveCartId(req);
  const {
    contactEmail,
    contactPhone,
    shippingAddress,
    paymentMethod,
    couponCode,
    notes,
  } = req.body;

  const order = provider.createOrder({
    cartId,
    contactEmail,
    contactPhone,
    shippingAddress,
    paymentMethod,
    couponCode: couponCode || null,
    notes,
    userId: req.user?.id || null,
    customerName: req.user?.name || shippingAddress.fullName,
  });

  if (paymentMethod === 'cod') {
    const confirmed = provider.updateOrderStatus(order.id, 'processing', 'Cash on delivery order', 'system');
    return { order: confirmed, payment: { provider: 'mock', method: 'cod', status: 'on_delivery', amountPaise: confirmed.totalPaise } };
  }

  return {
    order,
    payment: {
      provider: 'mock',
      method: paymentMethod,
      status: 'requires_confirmation',
      sessionId: `mock_session_${order.id.slice(-6)}`,
      amountPaise: order.totalPaise,
      message: 'DEMO payment session. No real money is charged.',
    },
  };
}

/**
 * Confirm the DEMO payment outcome for an order.
 *
 * DEMO ONLY. In production this endpoint would verify a Razorpay signature
 * server-side; here it simply flips the order status based on the requested
 * demo outcome so success and failure paths can be exercised end to end.
 */
export function verifyPayment(req) {
  const provider = getProvider();
  const { orderId, outcome } = req.body;
  const order = provider.getOrder(orderId);
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.paymentStatus === 'paid') {
    // Idempotent: replaying a demo confirmation does not double-charge.
    return { order, payment: { status: 'already_paid_demo' } };
  }

  if (outcome === 'failure') {
    const failed = provider.markPaymentFailed(order.id);
    return {
      order: failed,
      payment: {
        provider: 'mock',
        status: 'failed',
        message: 'DEMO payment failed. No money was charged. You can retry from the order page.',
      },
    };
  }

  const paid = provider.markOrderPaid(order.id, `mock_pay_${order.id.slice(-6)}`);
  return {
    order: paid,
    payment: {
      provider: 'mock',
      status: 'paid',
      reference: paid.paymentRef,
      message: 'DEMO payment captured. This is not a real transaction.',
    },
  };
}
