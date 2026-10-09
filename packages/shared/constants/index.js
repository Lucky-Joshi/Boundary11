/**
 * Shared domain constants used by the storefront, admin app and API.
 * Keeping these in one place avoids drift between the browser and the server.
 */

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SUPPORT: 'support',
  ADMIN: 'admin',
});

export const STAFF_ROLES = Object.freeze([ROLES.SUPPORT, ROLES.ADMIN]);

/**
 * Canonical order lifecycle. States are explicit so transitions can be
 * validated rather than guessed from free-text status strings.
 */
export const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
});

/**
 * Allowed status transitions. A status may only move to one of the values
 * listed here. Used by the API and the admin UI to prevent invalid updates.
 */
export const ORDER_STATUS_TRANSITIONS = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.REFUNDED]: [],
});

export function canTransitionOrderStatus(from, to) {
  return Boolean(ORDER_STATUS_TRANSITIONS[from]?.includes(to));
}

export const ORDER_STATUS_LABELS = Object.freeze({
  pending: 'Pending payment',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

export const PRODUCT_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export const SIZES = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'OS']);

export const INVENTORY_REASONS = Object.freeze([
  'restock',
  'sale',
  'return',
  'damage',
  'correction',
  'reservation',
  'release',
]);

export const INVENTORY_REASON_LABELS = Object.freeze({
  restock: 'Restock',
  sale: 'Sale',
  return: 'Customer return',
  damage: 'Damage / loss',
  correction: 'Manual correction',
  reservation: 'Stock reservation',
  release: 'Reservation release',
});

/** Lowest stock a variant may reach before it is flagged as low stock. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const CATEGORY_SLUGS = Object.freeze([
  'jerseys',
  'training',
  'hoodies',
  'caps',
  'bags',
  'accessories',
]);

export const SORT_OPTIONS = Object.freeze([
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popularity', label: 'Most popular' },
]);

export const DEFAULT_PAGE_SIZE = 12;

export const ORDER_ITEM_SNAPSHOT_FIELDS = Object.freeze([
  'productId',
  'variantId',
  'name',
  'slug',
  'sku',
  'size',
  'color',
  'unitPrice',
  'quantity',
  'image',
]);
