import { describe, it, expect } from 'vitest';
import { createDemoProvider } from '../src/providers/demoProvider.js';
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
    expect(providerModeFor({ nodeEnv: 'development', supabase: { configured: false } })).toBe('demo');
  });

  it('never selects supabase while running tests', () => {
    expect(providerModeFor({ nodeEnv: 'test', supabase: { configured: true } })).toBe('demo');
  });
});
