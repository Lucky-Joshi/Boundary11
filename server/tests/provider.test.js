import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDemoProvider } from '../src/providers/demoProvider.js';
import { createLocalProvider } from '../src/providers/localProvider.js';
import { createSupabaseProvider } from '../src/providers/supabaseProvider.js';
import { providerModeFor } from '../src/providers/index.js';

/**
 * The two providers must expose an identical repository interface so the
 * services can swap between them without change. Creating the Supabase
 * provider is side-effect free (clients are created lazily), so this runs
 * without any Supabase credentials.
 */
const INTERFACE = [
  'listCategories',
  'listCollections',
  'getCollection',
  'listProducts',
  'getProductBySlug',
  'getProductById',
  'createProduct',
  'updateProduct',
  'setProductStatus',
  'archiveProduct',
  'getCart',
  'addCartItem',
  'updateCartItem',
  'removeCartItem',
  'clearCart',
  'listCoupons',
  'getCouponByCode',
  'createCoupon',
  'listOrders',
  'getOrder',
  'createOrder',
  'markOrderPaid',
  'markPaymentFailed',
  'updateOrderStatus',
  'releaseOrderStock',
  'listCustomers',
  'listStaff',
  'listInventory',
  'adjustInventory',
  'listMovements',
  'listBanners',
  'getSettings',
  'listAuditLogs',
  'listReviews',
  'createReview',
  'setReviewStatus',
  'listContactMessages',
  'createContactMessage',
  'setContactMessageStatus',
  'listNewsletterSubscribers',
  'subscribeNewsletter',
  'authenticate',
  'getAccountById',
  'getAccountByEmail',
  'register',
  'getAnalytics',
];

describe('provider interface', () => {
  it('both providers implement every method and report a mode', () => {
    for (const factory of [createDemoProvider, createSupabaseProvider]) {
      const provider = factory();
      expect(['demo', 'supabase']).toContain(provider.mode);
      for (const name of INTERFACE) {
        expect(typeof provider[name], `${provider.mode}.${name}`).toBe('function');
      }
    }
  });
});

describe('provider selection', () => {
  it('selects supabase only when configured and not testing', () => {
    expect(providerModeFor({ nodeEnv: 'development', supabase: { configured: true } })).toBe('supabase');
    expect(providerModeFor({ nodeEnv: 'production', supabase: { configured: true } })).toBe('supabase');
    expect(providerModeFor({ nodeEnv: 'development', supabase: { configured: false } })).toBe('local');
    expect(providerModeFor({ nodeEnv: 'production', supabase: { configured: false } })).toBe('local');
  });

  it('respects an explicit provider request', () => {
    expect(providerModeFor({ nodeEnv: 'development', dataProvider: 'demo', supabase: { configured: true } })).toBe('demo');
    expect(providerModeFor({ nodeEnv: 'development', dataProvider: 'local', supabase: { configured: true } })).toBe('local');
    expect(providerModeFor({ nodeEnv: 'development', dataProvider: 'supabase', supabase: { configured: false } })).toBe('local');
  });

  it('never selects supabase while running tests', () => {
    expect(providerModeFor({ nodeEnv: 'test', supabase: { configured: true } })).toBe('demo');
    expect(providerModeFor({ nodeEnv: 'test', dataProvider: 'supabase', supabase: { configured: true } })).toBe('demo');
  });

  it('allows the local adapter explicitly while testing', () => {
    expect(providerModeFor({ nodeEnv: 'test', dataProvider: 'local', supabase: { configured: true } })).toBe('local');
  });
});

/**
 * A fresh local provider over an existing data dir — simulates a new process
 * hydrating whatever the previous one persisted.
 */
function spawnLocal(dataDir) {
  return createLocalProvider({ dataDir });
}

const shipping = {
  fullName: 'Test Buyer',
  phone: '9876543210',
  line1: '1 Test Lane',
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001',
};

describe('local adapter (durable file store)', () => {
  const tmpDirs = [];
  afterAll(() => {
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
  });

  function tmpDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b11-provider-'));
    tmpDirs.push(dir);
    return dir;
  }

  it('persists an order across provider instances', () => {
    const dir = tmpDir();
    const first = spawnLocal(dir);
    first._reset();
    const variant = first
      .listProducts()
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .find((x) => x.v.stock > 1);
    first.addCartItem('persist_cart', variant.v.id, 1);
    const created = first.createOrder({
      cartId: 'persist_cart',
      contactEmail: 'buyer@example.com',
      contactPhone: '+91 9876543210',
      shippingAddress: shipping,
      paymentMethod: 'mock_upi',
    });
    expect(created.id).toBeTruthy();

    // A brand-new instance over the same files must see the saved order.
    const second = spawnLocal(dir);
    const reloaded = second.getOrder(created.id);
    expect(reloaded).not.toBeNull();
    expect(reloaded.orderNumber).toBe(created.orderNumber);
    expect(first.mode).toBe('local');
    expect(second.mode).toBe('local');
  });

  it('persists registered accounts with hashed credentials', () => {
    const dir = tmpDir();
    const first = spawnLocal(dir);
    first._reset();
    first.register({ fullName: 'Persist Fan', email: 'persist@example.com', password: 'plaintext123' });

    const second = spawnLocal(dir);
    const auth = second.authenticate('persist@example.com', 'plaintext123');
    expect(auth).not.toBeNull();
    expect(auth.disabled).toBeUndefined();
    // Plaintext is never stored.
    const raw = first._store.load();
    expect(JSON.stringify(raw)).not.toContain('plaintext123');
  });
});

describe('idempotent order creation', () => {
  function demoWithCart() {
    const provider = createDemoProvider();
    const variant = provider
      .listProducts()
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .find((x) => x.v.stock > 1);
    provider.addCartItem('idem_cart', variant.v.id, 1);
    return { provider, variant };
  }

  it('replays the same order for a repeated key without double-reserving stock', () => {
    const { provider, variant } = demoWithCart();
    const payload = orderInput('idem_cart', 'price-123');
    const first = provider.createOrder(payload);
    const second = provider.createOrder(payload);
    expect(second.id).toBe(first.id);
    expect(provider.getProductById(variant.p.id).variants.find((v) => v.id === variant.v.id).stock)
      .toBe(variant.v.stock - 1);
  });

  it('creates a distinct order when the key differs', () => {
    const first = demoWithCart();
    const one = first.provider.createOrder(orderInput('idem_cart', 'key-a'));
    const second = demoWithCart();
    const two = second.provider.createOrder(orderInput('idem_cart', 'key-b'));
    expect(two.id).not.toBe(one.id);
  });
});

function orderInput(cartId, idempotencyKey) {
  return {
    cartId,
    idempotencyKey,
    contactEmail: 'buyer@example.com',
    contactPhone: '+91 9876543210',
    shippingAddress: shipping,
    paymentMethod: 'mock_upi',
  };
}

describe('releaseOrderStock', () => {
  it('is idempotent and restores stock exactly once', () => {
    const provider = createDemoProvider();
    const variant = provider
      .listProducts()
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .find((x) => x.v.stock > 1);
    provider.addCartItem('rel_cart', variant.v.id, 1);
    const order = provider.createOrder(orderInput('rel_cart'));
    const reserved = provider.getProductById(variant.p.id).variants.find((v) => v.id === variant.v.id).stock;

    provider.releaseOrderStock(order.id, 'test');
    provider.releaseOrderStock(order.id, 'test'); // no-op the second time
    const released = provider.getProductById(variant.p.id).variants.find((v) => v.id === variant.v.id).stock;
    expect(released).toBe(reserved + 1);
    expect(released).toBe(variant.v.stock);
  });

  it('releases stock automatically when an order is cancelled', () => {
    const provider = createDemoProvider();
    const variant = provider
      .listProducts()
      .flatMap((p) => p.variants.map((v) => ({ p, v })))
      .find((x) => x.v.stock > 1);
    provider.addCartItem('cancel_cart', variant.v.id, 1);
    const order = provider.createOrder(orderInput('cancel_cart'));
    provider.updateOrderStatus(order.id, 'cancelled', 'Cancelled', 'test');
    const after = provider.getProductById(variant.p.id).variants.find((v) => v.id === variant.v.id).stock;
    expect(after).toBe(variant.v.stock);
    expect(provider.getOrder(order.id).stockReleased).toBe(true);
  });
});
