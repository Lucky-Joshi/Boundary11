import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * List orders. Staff see every order; customers only see their own.
 * Guests without an account receive an empty list rather than a data leak.
 */
export function listOrders(req) {
  const provider = getProvider();
  const isStaff = req.user && ['admin', 'support'].includes(req.user.role);
  const { status, q } = req.query;

  if (isStaff) {
    return { items: provider.listOrders({ status, q }) };
  }
  if (!req.user) {
    return { items: [] };
  }
  return { items: provider.listOrders({ customerId: req.user.id, status, q }) };
}

export function getOrder(req) {
  const provider = getProvider();
  const order = provider.getOrder(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');
  const isStaff = req.user && ['admin', 'support'].includes(req.user.role);
  const isOwner = req.user && order.userId === req.user.id;
  if (!isStaff && !isOwner) {
    throw ApiError.forbidden('You cannot view this order.');
  }
  return order;
}
