import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

let adminToken;
let customerToken;
let cartId;

async function login(email, password) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  adminToken = await login('admin@boundary11.example', 'admin12345');
  customerToken = await login('fan@boundary11.example', 'customer123');
  cartId = 'cart_test_1';
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('health', () => {
  it('reports ok and the active data mode', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.mode).toBe('demo');
  });
});

describe('catalog', () => {
  it('lists published products with pagination metadata', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('totalPages');
    expect(res.body.items.every((p) => p.status === 'published')).toBe(true);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/v1/products?category=caps');
    expect(res.status).toBe(200);
    expect(res.body.items.every((p) => p.categorySlug === 'caps')).toBe(true);
  });

  it('searches by query text', async () => {
    const res = await request(app).get('/api/v1/products?q=jersey');
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/v1/products?sort=price-asc&pageSize=48');
    const prices = res.body.items.map((p) => p.minPricePaise);
    expect([...prices]).toEqual([...prices].sort((a, b) => a - b));
  });

  it('returns a single product by slug', async () => {
    const res = await request(app).get('/api/v1/products/matchday-home-jersey');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('matchday-home-jersey');
    expect(res.body.variants.length).toBeGreaterThan(0);
  });

  it('404s for an unknown slug', async () => {
    const res = await request(app).get('/api/v1/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('lists categories with product counts', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toHaveProperty('productCount');
  });

  it('rejects an invalid sort value', async () => {
    const res = await request(app).get('/api/v1/products?sort=alphabetical');
    expect(res.status).toBe(400);
  });
});

describe('cart', () => {
  it('returns an empty cart when none exists', async () => {
    const res = await request(app).get('/api/v1/cart').set('x-cart-id', cartId);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.totals.totalPaise).toBe(0);
  });

  it('adds a variant to the cart', async () => {
    const product = await request(app).get('/api/v1/products/matchday-home-jersey');
    const variant = product.body.variants.find((v) => v.stock > 2);
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('x-cart-id', cartId)
      .send({ variantId: variant.id, quantity: 1 });
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.totals.subtotalPaise).toBe(variant.pricePaise);
  });

  it('updates an item quantity', async () => {
    const cart = await request(app).get('/api/v1/cart').set('x-cart-id', cartId);
    const item = cart.body.items[0];
    const res = await request(app)
      .patch(`/api/v1/cart/items/${item.id}`)
      .set('x-cart-id', cartId)
      .send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(2);
  });

  it('rejects a quantity above stock', async () => {
    const product = await request(app).get('/api/v1/products/matchday-away-jersey');
    const variant = product.body.variants.find((v) => v.stock > 0 && v.stock < 10);
    const id = `cart_over_${Math.random().toString(36).slice(2)}`;
    const added = await request(app)
      .post('/api/v1/cart/items')
      .set('x-cart-id', id)
      .send({ variantId: variant.id, quantity: 1 });
    const item = added.body.items[0];
    const res = await request(app)
      .patch(`/api/v1/cart/items/${item.id}`)
      .set('x-cart-id', id)
      .send({ quantity: variant.stock + 1 });
    expect(res.status).toBe(422);
  });

  it('removes an item', async () => {
    const cart = await request(app).get('/api/v1/cart').set('x-cart-id', cartId);
    const item = cart.body.items[0];
    const res = await request(app)
      .delete(`/api/v1/cart/items/${item.id}`)
      .set('x-cart-id', cartId);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe('admin authorization', () => {
  it('rejects an anonymous admin request', async () => {
    const res = await request(app).get('/api/v1/admin/analytics');
    expect(res.status).toBe(401);
  });

  it('rejects a customer token on an admin route', async () => {
    const res = await request(app).get('/api/v1/admin/analytics').set(auth(customerToken));
    expect(res.status).toBe(403);
  });

  it('allows an admin to read analytics', async () => {
    const res = await request(app).get('/api/v1/admin/analytics').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('netRevenuePaise');
    expect(res.body.mode).toBe('demo');
  });

  it('does not let a customer create a product', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set(auth(customerToken))
      .send({ name: 'Hack', description: 'x'.repeat(30), categorySlug: 'caps', variants: [] });
    expect(res.status).toBe(403);
  });
});

describe('admin product CRUD', () => {
  let productId;

  it('creates a product', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set(auth(adminToken))
      .send({
        name: 'Test Slip-On Spikes',
        description: 'A test product with a sufficiently long description for validation.',
        categorySlug: 'accessories',
        status: 'published',
        variants: [{ sku: 'TEST-SPIKES-OS', size: 'OS', color: 'Navy', pricePaise: 49900, stock: 10 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('test-slip-on-spikes');
    productId = res.body.id;
  });

  it('rejects an invalid product payload', async () => {
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set(auth(adminToken))
      .send({ name: 'x', description: 'short', categorySlug: 'caps', variants: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toBeTruthy();
  });

  it('archives a product', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('archived');
  });
});

describe('inventory', () => {
  it('adjusts stock and records a movement', async () => {
    const inv = await request(app).get('/api/v1/admin/inventory').set(auth(adminToken));
    const row = inv.body.items.find((r) => !r.outOfStock);
    const res = await request(app)
      .post('/api/v1/admin/inventory/adjustments')
      .set(auth(adminToken))
      .send({ variantId: row.variantId, delta: 5, reason: 'restock', note: 'Test restock' });
    expect(res.status).toBe(201);
    expect(res.body.variant.stock).toBe(row.stock + 5);
  });

  it('rejects a zero adjustment', async () => {
    const inv = await request(app).get('/api/v1/admin/inventory').set(auth(adminToken));
    const res = await request(app)
      .post('/api/v1/admin/inventory/adjustments')
      .set(auth(adminToken))
      .send({ variantId: inv.body.items[0].variantId, delta: 0, reason: 'restock' });
    expect(res.status).toBe(400);
  });
});

describe('taxonomy and admin surface', () => {
  it('lists collections with product counts', async () => {
    const res = await request(app).get('/api/v1/collections');
    expect(res.status).toBe(200);
    expect(res.body.items.every((c) => typeof c.productCount === 'number')).toBe(true);
  });

  it('returns a collection with its products', async () => {
    const res = await request(app).get('/api/v1/collections/matchday');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });

  it('lists customers', async () => {
    const res = await request(app).get('/api/v1/admin/customers').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('lists discounts and creates a coupon', async () => {
    const list = await request(app).get('/api/v1/admin/discounts').set(auth(adminToken));
    expect(list.body.items.length).toBeGreaterThan(0);
    const code = `TEST${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const res = await request(app)
      .post('/api/v1/admin/discounts')
      .set(auth(adminToken))
      .send({ code, type: 'percent', value: 10, minSubtotalPaise: 100000, active: true });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(code);
  });

  it('lists banners including inactive ones', async () => {
    const res = await request(app).get('/api/v1/admin/content/banners').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.items.some((b) => b.active === false)).toBe(true);
  });

  it('returns store settings', async () => {
    const res = await request(app).get('/api/v1/admin/settings').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('storeName');
  });

  it('returns audit logs', async () => {
    const res = await request(app).get('/api/v1/admin/audit-logs').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});

describe('admin staff', () => {
  it('lists staff accounts (not customers)', async () => {
    const res = await request(app).get('/api/v1/admin/staff').set(auth(adminToken));
    expect(res.status).toBe(200);
    const emails = res.body.items.map((s) => s.email);
    expect(emails).toContain('admin@boundary11.example');
    expect(emails).toContain('support@boundary11.example');
    expect(emails).not.toContain('fan@boundary11.example');
    expect(res.body.items.every((s) => ['admin', 'support'].includes(s.role))).toBe(true);
  });
});

describe('checkout and mock payment', () => {
  const checkoutBody = {
    contactEmail: 'buyer@example.com',
    contactPhone: '+91 9876543210',
    shippingAddress: {
      fullName: 'Test Buyer',
      phone: '9876543210',
      line1: '1 Test Lane',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
    },
    paymentMethod: 'mock_upi',
  };

  async function freshCart() {
    const id = `cart_${Math.random().toString(36).slice(2)}`;
    const product = await request(app).get('/api/v1/products/cover-drive-training-tee');
    const variant = product.body.variants.find((v) => v.stock > 1);
    await request(app).post('/api/v1/cart/items').set('x-cart-id', id).send({ variantId: variant.id, quantity: 1 });
    return id;
  }

  it('validates the checkout payload', async () => {
    const id = await freshCart();
    const res = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send({ contactEmail: 'bad' });
    expect(res.status).toBe(400);
  });

  it('creates an order that starts pending', async () => {
    const id = await freshCart();
    const res = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('pending');
    expect(res.body.order.totalPaise).toBeGreaterThan(0);
    expect(res.body.payment.status).toBe('requires_confirmation');
  });

  it('captures a mock payment successfully', async () => {
    const id = await freshCart();
    const created = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .send({ orderId: created.body.order.id, outcome: 'success' });
    expect(res.status).toBe(200);
    expect(res.body.order.paymentStatus).toBe('paid');
    expect(res.body.order.status).toBe('paid');
  });

  it('handles a mock payment failure', async () => {
    const id = await freshCart();
    const created = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    const res = await request(app)
      .post('/api/v1/payments/verify')
      .send({ orderId: created.body.order.id, outcome: 'failure' });
    expect(res.status).toBe(200);
    expect(res.body.order.paymentStatus).toBe('failed');
    expect(res.body.order.status).toBe('pending');
  });

  it('rejects checkout on an empty cart', async () => {
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', 'cart_empty_xyz')
      .send(checkoutBody);
    expect(res.status).toBe(400);
  });

  it('enforces valid order status transitions', async () => {
    const id = await freshCart();
    const created = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${created.body.order.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'delivered' });
    expect(res.status).toBe(422);
  });
});

describe('logout and session expiry', () => {
  it('revokes a token so it can no longer authenticate', async () => {
    const token = await login('fan@boundary11.example', 'customer123');
    const loggedOut = await request(app).post('/api/v1/auth/logout').set(auth(token));
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.body.revoked).toBe(true);

    const me = await request(app).get('/api/v1/auth/me').set(auth(token));
    expect(me.status).toBe(401);

    // A token not revoked still works.
    const meAgain = await request(app).get('/api/v1/auth/me').set(auth(customerToken));
    expect(meAgain.status).toBe(200);
  });
});

describe('checkout idempotency and cancellation', () => {
  const checkoutBody = {
    contactEmail: 'buyer@example.com',
    contactPhone: '+91 9876543210',
    shippingAddress: {
      fullName: 'Test Buyer',
      phone: '9876543210',
      line1: '1 Test Lane',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
    },
    paymentMethod: 'mock_upi',
  };

  async function freshCart() {
    const id = `cart_${Math.random().toString(36).slice(2)}`;
    const product = await request(app).get('/api/v1/products/cover-drive-training-tee');
    const variant = product.body.variants.find((v) => v.stock > 1);
    await request(app).post('/api/v1/cart/items').set('x-cart-id', id).send({ variantId: variant.id, quantity: 1 });
    return { id, variant };
  }

  it('is idempotent when an Idempotency-Key is replayed', async () => {
    const { id, variant } = await freshCart();
    const key = `test-key-${Math.random().toString(36).slice(2)}`;
    const first = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', id)
      .set('Idempotency-Key', key)
      .send(checkoutBody);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', id)
      .set('Idempotency-Key', key)
      .send(checkoutBody);
    expect(second.status).toBe(201);
    expect(second.body.order.id).toBe(first.body.order.id);

    // Stock was reserved exactly once even though checkout ran twice.
    const product = await request(app).get('/api/v1/products/cover-drive-training-tee');
    const after = product.body.variants.find((v) => v.id === variant.id);
    expect(after.stock).toBe(variant.stock - 1);
  });

  it('rejects a malformed idempotency key', async () => {
    const { id } = await freshCart();
    const res = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', id)
      .send({ ...checkoutBody, idempotencyKey: 'bad key with spaces!' });
    expect(res.status).toBe(400);
  });

  it('lets the owner cancel a pending order and releases reserved stock', async () => {
    const { id, variant } = await freshCart();
    const created = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', id)
      .set(auth(customerToken))
      .send(checkoutBody);

    const cancelled = await request(app)
      .post(`/api/v1/orders/${created.body.order.id}/cancel`)
      .set(auth(customerToken));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.stockReleased).toBe(true);

    const product = await request(app).get('/api/v1/products/cover-drive-training-tee');
    const after = product.body.variants.find((v) => v.id === variant.id);
    expect(after.stock).toBe(variant.stock);
  });

  it('lets staff cancel any order', async () => {
    const { id } = await freshCart();
    const created = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    const res = await request(app)
      .post(`/api/v1/orders/${created.body.order.id}/cancel`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('blocks a stranger from cancelling someone elses order', async () => {
    const other = {
      fullName: 'Other Buyer',
      email: `other_${Math.random().toString(36).slice(2)}@example.com`,
      password: 'opensesame123',
    };
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ fullName: other.fullName, email: other.email, password: other.password });
    const strangerToken = registered.body.token;

    const { id } = await freshCart();
    const created = await request(app).post('/api/v1/checkout').set('x-cart-id', id).send(checkoutBody);
    const res = await request(app)
      .post(`/api/v1/orders/${created.body.order.id}/cancel`)
      .set(auth(strangerToken));
    expect(res.status).toBe(403);
  });

  it('rejects cancelling a shipped order', async () => {
    const { id } = await freshCart();
    const created = await request(app)
      .post('/api/v1/checkout')
      .set('x-cart-id', id)
      .set(auth(customerToken))
      .send(checkoutBody);
    await request(app)
      .post('/api/v1/payments/verify')
      .send({ orderId: created.body.order.id, outcome: 'success' });
    await request(app)
      .patch(`/api/v1/admin/orders/${created.body.order.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'processing' });
    await request(app)
      .patch(`/api/v1/admin/orders/${created.body.order.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'shipped' });
    const res = await request(app)
      .post(`/api/v1/orders/${created.body.order.id}/cancel`)
      .set(auth(customerToken));
    expect(res.status).toBe(422);
  });
});

describe('product reviews', () => {
  let reviewId;

  it('starts with an empty published review list', async () => {
    const res = await request(app).get('/api/v1/products/matchday-home-jersey/reviews');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.summary.count).toBe(0);
  });

  it('requires a signed-in user to post a review', async () => {
    const res = await request(app)
      .post('/api/v1/products/matchday-home-jersey/reviews')
      .send({ rating: 5, body: 'A fantastic jersey for the price.' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid review payload', async () => {
    const res = await request(app)
      .post('/api/v1/products/matchday-home-jersey/reviews')
      .set(auth(customerToken))
      .send({ rating: 9, body: 'nope' });
    expect(res.status).toBe(400);
  });

  it('creates a review and blends the product rating', async () => {
    const before = await request(app).get('/api/v1/products/matchday-home-jersey');
    const res = await request(app)
      .post('/api/v1/products/matchday-home-jersey/reviews')
      .set(auth(customerToken))
      .send({ rating: 5, title: 'Great fit', body: 'Lovely fabric and a true-to-size fit.' });
    expect(res.status).toBe(201);
    reviewId = res.body.id;

    const after = await request(app).get('/api/v1/products/matchday-home-jersey/reviews');
    expect(after.body.items).toHaveLength(1);
    expect(after.body.reviewCount).toBe(before.body.reviewCount + 1);

    const product = await request(app).get('/api/v1/products/matchday-home-jersey');
    expect(product.body.reviewCount).toBe(before.body.reviewCount + 1);
  });

  it('lets an admin moderate a review out of the public list', async () => {
    const list = await request(app).get('/api/v1/admin/reviews').set(auth(adminToken));
    expect(list.body.items.some((r) => r.id === reviewId)).toBe(true);

    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${reviewId}`)
      .set(auth(adminToken))
      .send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');

    const after = await request(app).get('/api/v1/products/matchday-home-jersey/reviews');
    expect(after.body.items).toHaveLength(0);
  });
});

describe('contact and newsletter persistence', () => {
  it('stores a contact message for staff', async () => {
    const email = `fan_${Math.random().toString(36).slice(2)}@example.com`;
    const res = await request(app).post('/api/v1/contact').send({
      name: 'Test Fan',
      email,
      subject: 'Sizing question',
      message: 'Which size should I order for a 40 inch chest?',
    });
    expect(res.status).toBe(201);
    expect(res.body.received).toBe(true);

    const list = await request(app).get('/api/v1/admin/messages').set(auth(adminToken));
    const stored = list.body.items.find((m) => m.email === email);
    expect(stored).toBeTruthy();
    expect(stored.status).toBe('new');

    const updated = await request(app)
      .patch(`/api/v1/admin/messages/${stored.id}`)
      .set(auth(adminToken))
      .send({ status: 'resolved' });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('resolved');
  });

  it('subscribes to the newsletter idempotently', async () => {
    const email = `news_${Math.random().toString(36).slice(2)}@example.com`;
    const first = await request(app).post('/api/v1/newsletter').send({ email });
    expect(first.status).toBe(201);
    expect(first.body.already).toBe(false);

    const second = await request(app).post('/api/v1/newsletter').send({ email });
    expect(second.status).toBe(200);
    expect(second.body.already).toBe(true);

    const list = await request(app).get('/api/v1/admin/subscribers').set(auth(adminToken));
    expect(list.body.items.some((s) => s.email === email.toLowerCase())).toBe(true);
  });
});

describe('admin CSV exports', () => {
  it('exports orders as a CSV attachment', async () => {
    const res = await request(app).get('/api/v1/admin/exports/orders').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('boundary11-orders.csv');
    expect(res.text.split('\n')[0]).toContain('Order');
  });

  it('exports inventory as CSV', async () => {
    const res = await request(app).get('/api/v1/admin/exports/inventory').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.text.split('\n')[0]).toContain('SKU');
  });

  it('404s on an unknown export kind', async () => {
    const res = await request(app).get('/api/v1/admin/exports/nonsense').set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});
