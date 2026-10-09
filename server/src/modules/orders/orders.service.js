import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * List orders. Staff see every order; customers only see their own.
 * Guests without an account receive an empty list rather than a data leak.
 */
export async function listOrders(req) {
  const provider = getProvider();
  const isStaff = req.user && ['admin', 'support'].includes(req.user.role);
  const { status, q } = req.query;

  if (isStaff) {
    return { items: await provider.listOrders({ status, q }) };
  }
  if (!req.user) {
    return { items: [] };
  }
  return { items: await provider.listOrders({ customerId: req.user.id, status, q }) };
}

export async function getOrder(req) {
  const provider = getProvider();
  const order = await provider.getOrder(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  const isStaff = req.user && ['admin', 'support'].includes(req.user.role);
  const isOwner = req.user && order.userId === req.user.id;
  if (!isStaff && !isOwner) {
    throw ApiError.forbidden('You cannot view this order.');
  }
  return order;
}

/**
 * Cancel an order. The customer who placed the order, or any staff member,
 * may cancel unfulfilled orders (pending/paid/processing). Reserved stock is
 * released back to inventory on cancellation so it is not lost.
 */
export async function cancelOrder(req) {
  const provider = getProvider();
  const order = await provider.getOrder(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');

  const isStaff = req.user && ['admin', 'support'].includes(req.user.role);
  const isOwner = req.user && order.userId === req.user.id;
  if (!isStaff && !isOwner) {
    throw ApiError.forbidden('You cannot cancel this order.');
  }

  if (['cancelled', 'refunded', 'shipped', 'delivered'].includes(order.status)) {
    throw ApiError.unprocessable(`An order in "${order.status}" status cannot be cancelled.`, {
      status: 'Only unfulfilled orders can be cancelled.',
    });
  }

  const cancelled = await provider.updateOrderStatus(
    order.id,
    'cancelled',
    'Cancelled' + (isOwner && !isStaff ? ' by customer' : ''),
    req.user?.name || req.user?.email || 'customer',
  );
  return cancelled;
}
