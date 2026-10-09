const BASE = 'http://localhost:5000/api/v1';
let passed = 0;
function ok(label, cond, extra = '') {
  if (!cond) throw new Error(`FAIL: ${label} ${extra}`);
  passed += 1;
  console.log(`  ok  ${label}${extra ? '  ' + extra : ''}`);
}

async function call(path, { method = 'GET', body, token, cartId } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cartId) headers['x-cart-id'] = cartId;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

(async () => {
  console.log('Public catalog');
  const health = await call('/health');
  ok('health', health.status === 'ok', `mode=${health.mode}`);
  const categories = await call('/categories');
  ok('categories list', categories.items.length >= 6);
  const product = await call('/products/matchday-home-jersey');
  ok('product detail', product.slug === 'matchday-home-jersey');
  ok('variants present', product.variants.length > 0);
  const variantId = product.variants.find((v) => v.stock > 0).id;

  console.log('Cart');
  const cartId = `smoke_cart_${Date.now()}`;
  const added = await call('/cart/items', { method: 'POST', body: { variantId, quantity: 1 }, cartId });
  ok('add to cart', added.items.length === 1);
  const cart = await call('/cart', { cartId });
  ok('get cart total', cart.totals.subtotalPaise === product.variants.find((v) => v.id === variantId).pricePaise, `subtotal=${cart.totals.subtotalPaise}`);

  console.log('Checkout (mock payment)');
  const checkout = await call('/checkout', {
    method: 'POST',
    cartId,
    body: {
      contactEmail: 'smoke@example.com',
      contactPhone: '+91 90000 00000',
      shippingAddress: {
        fullName: 'Smoke Tester',
        phone: '+91 90000 00000',
        line1: '12 Stadium Road',
        line2: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'mock_upi',
      couponCode: 'BOUNDARY10',
    },
  });
  ok('order created', Boolean(checkout.order.id), checkout.order.orderNumber);
  ok('coupon applied', checkout.order.discountPaise > 0, `discount=${checkout.order.discountPaise}`);
  ok('payment session returned', checkout.payment.status === 'requires_confirmation');
  const verified = await call('/payments/verify', { method: 'POST', body: { orderId: checkout.order.id, outcome: 'success' } });
  ok('payment verified', verified.payment.status === 'paid' && verified.order.status === 'paid');

  console.log('Auth + orders');
  const admin = await call('/auth/login', { method: 'POST', body: { email: 'admin@boundary11.example', password: 'admin12345' } });
  ok('admin login', admin.user.role === 'admin');
  const me = await call('/auth/me', { token: admin.token });
  ok('auth me', me.email === 'admin@boundary11.example');

  console.log('Admin surface');
  const analytics = await call('/admin/analytics', { token: admin.token });
  ok('analytics', typeof analytics.netRevenuePaise === 'number', `orders=${analytics.orderCount}`);
  const adminOrders = await call('/admin/orders', { token: admin.token });
  ok('admin orders', adminOrders.items.length > 0, `count=${adminOrders.items.length}`);
  const moved = await call(`/admin/orders/${checkout.order.id}/status`, { method: 'PATCH', token: admin.token, body: { status: 'processing', note: 'smoke test' } });
  ok('order status transition', moved.status === 'processing');
  const products = await call('/admin/products?includeArchived=true', { token: admin.token });
  ok('admin products', products.items.length >= 10);
  const inventory = await call('/admin/inventory', { token: admin.token });
  ok('admin inventory', inventory.items.length > 0);
  const customers = await call('/admin/customers', { token: admin.token });
  ok('admin customers', customers.items.length > 0);
  const discounts = await call('/admin/discounts', { token: admin.token });
  ok('admin discounts', discounts.items.length >= 3);
  const banners = await call('/admin/content/banners', { token: admin.token });
  ok('admin banners', banners.items.length >= 3);
  const settings = await call('/admin/settings', { token: admin.token });
  ok('admin settings', settings.storeName === 'Boundary11');
  const audit = await call('/admin/audit-logs', { token: admin.token });
  ok('admin audit logs', audit.items.length > 0);
  const staff = await call('/admin/staff', { token: admin.token });
  ok('admin staff', staff.items.length >= 2);

  console.log('Authorization');
  const support = await call('/auth/login', { method: 'POST', body: { email: 'support@boundary11.example', password: 'support123' } });
  let forbidden = false;
  try {
    await call('/admin/audit-logs', { token: support.token });
  } catch (err) {
    forbidden = String(err.message).includes('403');
  }
  ok('support blocked from admin-only route', forbidden);

  console.log(`\nALL ${passed} SMOKE CHECKS PASSED`);
})().catch((err) => {
  console.error('\nSMOKE TEST FAILED');
  console.error(err.message);
  process.exit(1);
});
