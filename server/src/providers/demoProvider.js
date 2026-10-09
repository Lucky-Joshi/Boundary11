import {
  categories as seedCategories,
  collections as seedCollections,
  products as seedProducts,
  coupons as seedCoupons,
  banners as seedBanners,
  storeSettings as seedSettings,
  demoAccounts,
} from '../data/demoData.js';
import { generateId, generateOrderNumber, slugify, nowISO } from '../utils/ids.js';
import { ApiError } from '../utils/ApiError.js';
import {
  computeTotals,
  multiplyPaise,
  DEFAULT_LOW_STOCK_THRESHOLD,
  canTransitionOrderStatus,
} from '@boundary11/shared';

const clone = (value) => JSON.parse(JSON.stringify(value));

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * In-memory demo provider.
 *
 * NOTE: This is prototype persistence only. State lives in process memory and
 * resets on restart. It is isolated behind a small repository-style interface
 * so a Supabase-backed provider can replace it without touching the services.
 */
export function createDemoProvider() {
  const state = {
    mode: 'demo',
    categories: clone(seedCategories),
    collections: clone(seedCollections),
    products: clone(seedProducts),
    coupons: clone(seedCoupons),
    banners: clone(seedBanners),
    settings: clone(seedSettings),
    accounts: clone(demoAccounts).map(({ password: _pw, ...rest }) => ({ ...rest, id: rest.id })),
    cart: new Map(),
    orders: [],
    inventoryMovements: [],
    auditLogs: [],
    reviews: [],
  };

  // credential store kept separate from the public account objects
  const credentials = new Map(clone(demoAccounts).map((a) => [a.id, a.password]));

  function findProduct(productId) {
    return state.products.find((p) => p.id === productId);
  }

  function findVariant(variantId) {
    for (const product of state.products) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) return { product, variant };
    }
    return null;
  }

  function recordMovement({ variantId, productId, delta, reason, note, actor, balanceAfter }) {
    const movement = {
      id: generateId('mov'),
      variantId,
      productId,
      delta,
      reason,
      note: note || '',
      actor: actor || 'system',
      balanceAfter,
      createdAt: nowISO(),
    };
    state.inventoryMovements.unshift(movement);
    return movement;
  }

  function recordAudit(actor, action, entity, entityId, detail) {
    const entry = {
      id: generateId('audit'),
      actor: actor || 'system',
      action,
      entity,
      entityId,
      detail: detail || '',
      createdAt: nowISO(),
    };
    state.auditLogs.unshift(entry);
    return entry;
  }

  // -------------------------------------------------------------------------
  // Seed a handful of historical orders so the admin dashboard has real
  // (demo) records to aggregate instead of invented numbers.
  // -------------------------------------------------------------------------
  function seedOrders() {
    const pick = (slug, sku) => {
      const product = state.products.find((p) => p.slug === slug);
      const variant = product?.variants.find((v) => v.sku === sku) || product?.variants[0];
      return { product, variant };
    };

    const plan = [
      { daysAgo: 1, status: 'paid', items: [pick('matchday-home-jersey', 'B11-HOME-M')], customer: 2 },
      { daysAgo: 2, status: 'shipped', items: [pick('deep-midwicket-hoodie', 'B11-MIDWICKET-L'), pick('sunset-sixer-cap', 'B11-SIXER-OS')], customer: 3 },
      { daysAgo: 4, status: 'delivered', items: [pick('cover-drive-training-tee', 'B11-COVER-M')], customer: 2 },
      { daysAgo: 6, status: 'processing', items: [pick('boundary11-kit-bag-backpack', 'B11-KITBAG-OS')], customer: 3 },
      { daysAgo: 9, status: 'delivered', items: [pick('matchday-away-jersey', 'B11-AWAY-L')], customer: 2 },
      { daysAgo: 12, status: 'cancelled', items: [pick('boundary11-wristband-pack', 'B11-WRIST-OS')], customer: 3 },
      { daysAgo: 15, status: 'delivered', items: [pick('heritage-retro-jersey', 'B11-RETRO-M'), pick('classic-field-cap', 'B11-FIELD-OS')], customer: 2 },
      { daysAgo: 20, status: 'refunded', items: [pick('team-travel-hoodie', 'B11-TRAVEL-L')], customer: 3 },
    ];

    plan.forEach((entry, index) => {
      const account = state.accounts[entry.customer];
      const items = entry.items
        .filter(({ product, variant }) => product && variant)
        .map(({ product, variant }) => ({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          slug: product.slug,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          unitPrice: variant.pricePaise,
          quantity: 1,
          image: product.images?.[0] || null,
        }));
      if (items.length === 0) return;
      const subtotalPaise = items.reduce((sum, i) => sum + multiplyPaise(i.unitPrice, i.quantity), 0);
      const shippingPaise = subtotalPaise >= state.settings.freeShippingThresholdPaise ? 0 : state.settings.flatShippingPaise;
      const createdAt = daysAgo(entry.daysAgo);
      const paymentStatus = entry.status === 'refunded' ? 'refunded' : entry.status === 'cancelled' ? 'failed' : 'paid';
      state.orders.push({
        id: `order_seed_${index + 1}`,
        orderNumber: `B11-DEMO-${1000 + index}`,
        userId: account.id,
        customerName: account.fullName,
        contactEmail: account.email,
        contactPhone: '+91 90000 00000',
        shippingAddress: {
          fullName: account.fullName,
          phone: '+91 90000 00000',
          line1: `${10 + index} Stadium Road`,
          line2: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India',
        },
        items,
        subtotalPaise,
        discountPaise: 0,
        shippingPaise,
        totalPaise: subtotalPaise + shippingPaise,
        couponCode: null,
        status: entry.status,
        paymentStatus,
        paymentMethod: 'mock_upi',
        paymentRef: `pay_demo_${index + 1}`,
        notes: '',
        createdAt,
        updatedAt: createdAt,
        statusHistory: [{ status: entry.status, at: createdAt, note: 'Seeded demo order', actor: 'seed' }],
      });
    });
  }

  seedOrders();

  const provider = {
    mode: 'demo',

    // ----- Catalog -------------------------------------------------------
    listCategories() {
      return clone([...state.categories].sort((a, b) => a.displayOrder - b.displayOrder));
    },

    listCollections() {
      return clone(state.collections);
    },

    getCollection(slug) {
      return clone(state.collections.find((c) => c.slug === slug) || null);
    },

    listProducts({ includeUnpublished = false } = {}) {
      const items = includeUnpublished
        ? state.products
        : state.products.filter((p) => p.status === 'published');
      return clone(items);
    },

    getProductBySlug(slug) {
      return clone(state.products.find((p) => p.slug === slug) || null);
    },

    getProductById(id) {
      return clone(findProduct(id) || null);
    },

    createProduct(input) {
      const slug = input.slug || slugify(input.name);
      if (state.products.some((p) => p.slug === slug)) {
        throw ApiError.conflict('A product with this slug already exists.', { slug: 'Slug must be unique.' });
      }
      const product = {
        id: generateId('prod'),
        name: input.name,
        slug,
        categorySlug: input.categorySlug,
        collections: input.collections || [],
        tags: input.tags || [],
        shortDescription: input.shortDescription || '',
        description: input.description,
        status: input.status || 'draft',
        featured: Boolean(input.featured),
        rating: 0,
        reviewCount: 0,
        accent: input.accent || '#1d2b53',
        createdAt: nowISO(),
        images: input.images?.length ? input.images : [{ url: null, alt: input.name }],
        variants: input.variants.map((variant) => ({
          ...variant,
          id: variant.id || generateId('var'),
        })),
      };
      state.products.unshift(product);
      product.variants.forEach((variant) => {
        recordMovement({
          variantId: variant.id,
          productId: product.id,
          delta: variant.stock,
          reason: 'restock',
          note: 'Initial stock',
          actor: input._actor,
          balanceAfter: variant.stock,
        });
      });
      recordAudit(input._actor, 'product.create', 'product', product.id, product.name);
      return clone(product);
    },

    updateProduct(id, input) {
      const product = findProduct(id);
      if (!product) return null;
      const nextSlug = input.slug || product.slug;
      if (state.products.some((p) => p.slug === nextSlug && p.id !== id)) {
        throw ApiError.conflict('A product with this slug already exists.', { slug: 'Slug must be unique.' });
      }
      Object.assign(product, {
        name: input.name ?? product.name,
        slug: nextSlug,
        categorySlug: input.categorySlug ?? product.categorySlug,
        collections: input.collections ?? product.collections,
        tags: input.tags ?? product.tags,
        shortDescription: input.shortDescription ?? product.shortDescription,
        description: input.description ?? product.description,
        status: input.status ?? product.status,
        featured: input.featured ?? product.featured,
        images: input.images ?? product.images,
      });
      if (Array.isArray(input.variants)) {
        const incomingIds = new Set(input.variants.map((v) => v.id).filter(Boolean));
        product.variants = input.variants.map((variant) => ({
          ...variant,
          id: variant.id && product.variants.some((v) => v.id === variant.id) ? variant.id : generateId('var'),
        }));
        // record a movement for any variant stock explicitly changed
        product.variants.forEach((variant) => {
          const previous = state.inventoryMovements.find((m) => m.variantId === variant.id);
          if (!incomingIds.has(variant.id) && previous) {
            recordMovement({
              variantId: variant.id,
              productId: product.id,
              delta: variant.stock,
              reason: 'correction',
              note: 'Product edit',
              actor: input._actor,
              balanceAfter: variant.stock,
            });
          }
        });
      }
      recordAudit(input._actor, 'product.update', 'product', product.id, product.name);
      return clone(product);
    },

    setProductStatus(id, status, actor) {
      const product = findProduct(id);
      if (!product) return null;
      product.status = status;
      recordAudit(actor, 'product.status', 'product', product.id, status);
      return clone(product);
    },

    archiveProduct(id, actor) {
      const product = findProduct(id);
      if (!product) return null;
      product.status = 'archived';
      recordAudit(actor, 'product.archive', 'product', product.id, product.name);
      return clone(product);
    },

    // ----- Cart ----------------------------------------------------------
    getCart(cartId) {
      return clone(state.cart.get(cartId) || { id: cartId, items: [], updatedAt: nowISO() });
    },

    _persistCart(cart) {
      cart.updatedAt = nowISO();
      state.cart.set(cart.id, cart);
      return clone(cart);
    },

    _hydrateCartItem(variantId, quantity) {
      const found = findVariant(variantId);
      if (!found) throw ApiError.notFound('That variant no longer exists.');
      const { product, variant } = found;
      if (product.status !== 'published') {
        throw ApiError.unprocessable('That product is not currently available.');
      }
      return {
        id: generateId('ci'),
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        slug: product.slug,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        unitPrice: variant.pricePaise,
        compareAtPaise: variant.compareAtPaise,
        quantity,
        stock: variant.stock,
        image: product.images?.[0] || null,
      };
    },

    addCartItem(cartId, variantId, quantity) {
      const cart = state.cart.get(cartId) || { id: cartId, items: [], updatedAt: nowISO() };
      const existing = cart.items.find((i) => i.variantId === variantId);
      const found = findVariant(variantId);
      if (!found) throw ApiError.notFound('That variant no longer exists.');
      const desired = (existing?.quantity || 0) + quantity;
      if (desired > found.variant.stock) {
        throw ApiError.unprocessable(`Only ${found.variant.stock} left in stock.`);
      }
      if (existing) {
        existing.quantity = desired;
      } else {
        cart.items.push(provider._hydrateCartItem(variantId, quantity));
      }
      return provider._persistCart(cart);
    },

    updateCartItem(cartId, itemId, quantity) {
      const cart = state.cart.get(cartId);
      if (!cart) throw ApiError.notFound('Cart not found.');
      const item = cart.items.find((i) => i.id === itemId || i.variantId === itemId);
      if (!item) throw ApiError.notFound('Cart item not found.');
      const found = findVariant(item.variantId);
      if (found && quantity > found.variant.stock) {
        throw ApiError.unprocessable(`Only ${found.variant.stock} left in stock.`);
      }
      item.quantity = quantity;
      return provider._persistCart(cart);
    },

    removeCartItem(cartId, itemId) {
      const cart = state.cart.get(cartId);
      if (!cart) throw ApiError.notFound('Cart not found.');
      cart.items = cart.items.filter((i) => i.id !== itemId && i.variantId !== itemId);
      return provider._persistCart(cart);
    },

    clearCart(cartId) {
      const cart = state.cart.get(cartId);
      if (cart) {
        cart.items = [];
        provider._persistCart(cart);
      }
      return provider.getCart(cartId);
    },

    // ----- Coupons -------------------------------------------------------
    listCoupons() {
      return clone(state.coupons);
    },

    getCouponByCode(code) {
      const needle = String(code || '').trim().toUpperCase();
      return clone(state.coupons.find((c) => c.code === needle) || null);
    },

    createCoupon(input, actor) {
      if (state.coupons.some((c) => c.code === input.code)) {
        throw ApiError.conflict('That coupon code already exists.', { code: 'Code must be unique.' });
      }
      const coupon = { id: generateId('coup'), usedCount: 0, ...input };
      state.coupons.unshift(coupon);
      recordAudit(actor, 'coupon.create', 'coupon', coupon.id, coupon.code);
      return clone(coupon);
    },

    // ----- Orders --------------------------------------------------------
    listOrders({ status, q, customerId } = {}) {
      let orders = [...state.orders];
      if (status) orders = orders.filter((o) => o.status === status);
      if (customerId) orders = orders.filter((o) => o.userId === customerId);
      if (q) {
        const needle = q.toLowerCase();
        orders = orders.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(needle) ||
            o.contactEmail.toLowerCase().includes(needle) ||
            (o.customerName || '').toLowerCase().includes(needle),
        );
      }
      return clone(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    },

    getOrder(id) {
      return clone(state.orders.find((o) => o.id === id || o.orderNumber === id) || null);
    },

    /**
     * Create an order from a cart with a synchronous stock check so two
     * simultaneous orders cannot oversell the same variant.
     */
    createOrder({ cartId, contactEmail, contactPhone, shippingAddress, paymentMethod, couponCode, notes, userId, customerName }) {
      const cart = state.cart.get(cartId);
      if (!cart || cart.items.length === 0) {
        throw ApiError.badRequest('Your cart is empty.');
      }
      // Re-validate every line against current catalog data.
      const lines = cart.items.map((item) => {
        const found = findVariant(item.variantId);
        if (!found) throw ApiError.conflict('An item in your cart is no longer available.');
        const { product, variant } = found;
        if (product.status !== 'published') {
          throw ApiError.conflict(`${product.name} is no longer available.`);
        }
        if (variant.stock < item.quantity) {
          throw ApiError.conflict(`Only ${variant.stock} of ${product.name} (${variant.size}) left in stock.`);
        }
        return {
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          slug: product.slug,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          unitPrice: variant.pricePaise,
          quantity: item.quantity,
          image: product.images?.[0] || null,
        };
      });

      const coupon = couponCode ? provider.getCouponByCode(couponCode) : null;
      const totals = computeTotals(
        lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
        { coupon: coupon && coupon.active ? coupon : null },
      );
      if (couponCode && (!coupon || !coupon.active || !totals.couponQualifies)) {
        throw ApiError.unprocessable('That coupon is not valid for this order.', {
          couponCode: 'Coupon could not be applied.',
        });
      }

      // Decrement stock atomically (single-threaded) and log movements.
      lines.forEach((line) => {
        const found = findVariant(line.variantId);
        found.variant.stock -= line.quantity;
        recordMovement({
          variantId: line.variantId,
          productId: line.productId,
          delta: -line.quantity,
          reason: 'sale',
          note: 'Order placed (demo)',
          actor: userId || 'guest',
          balanceAfter: found.variant.stock,
        });
      });

      const createdAt = nowISO();
      const order = {
        id: generateId('order'),
        orderNumber: generateOrderNumber(),
        userId: userId || null,
        customerName: customerName || shippingAddress.fullName,
        contactEmail,
        contactPhone,
        shippingAddress,
        items: lines,
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        totalPaise: totals.totalPaise,
        couponCode: totals.discountPaise > 0 ? coupon.code : null,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod,
        paymentRef: null,
        notes: notes || '',
        createdAt,
        updatedAt: createdAt,
        statusHistory: [{ status: 'pending', at: createdAt, note: 'Order created (demo)', actor: userId || 'guest' }],
      };
      state.orders.unshift(order);
      if (order.couponCode) {
        const usedCoupon = state.coupons.find((c) => c.code === order.couponCode);
        if (usedCoupon) usedCoupon.usedCount += 1;
      }
      state.cart.delete(cartId);
      recordAudit(userId || 'guest', 'order.create', 'order', order.id, order.orderNumber);
      return clone(order);
    },

    markOrderPaid(orderId, paymentRef) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      order.paymentStatus = 'paid';
      order.paymentRef = paymentRef;
      order.status = 'paid';
      order.updatedAt = nowISO();
      order.statusHistory.push({ status: 'paid', at: order.updatedAt, note: 'Mock payment captured', actor: 'system' });
      return clone(order);
    },

    markPaymentFailed(orderId) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      order.paymentStatus = 'failed';
      order.updatedAt = nowISO();
      return clone(order);
    },

    updateOrderStatus(orderId, status, note, actor) {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      if (!canTransitionOrderStatus(order.status, status)) {
        throw ApiError.unprocessable(`Cannot move an order from "${order.status}" to "${status}".`, {
          status: `Invalid transition from ${order.status}.`,
        });
      }
      order.status = status;
      if (status === 'refunded') order.paymentStatus = 'refunded';
      order.updatedAt = nowISO();
      order.statusHistory.push({ status, at: order.updatedAt, note: note || '', actor: actor || 'system' });
      recordAudit(actor, 'order.status', 'order', order.id, `${order.orderNumber} -> ${status}`);
      return clone(order);
    },

    // ----- Customers -----------------------------------------------------
    listCustomers() {
      const byEmail = new Map();
      for (const order of state.orders) {
        const key = order.contactEmail;
        const existing = byEmail.get(key) || {
          email: key,
          name: order.customerName,
          orderCount: 0,
          totalSpentPaise: 0,
          lastOrderAt: null,
          status: 'active',
        };
        existing.orderCount += 1;
        if (order.paymentStatus === 'paid' && order.status !== 'refunded') {
          existing.totalSpentPaise += order.totalPaise;
        }
        if (!existing.lastOrderAt || new Date(order.createdAt) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = order.createdAt;
        }
        byEmail.set(key, existing);
      }
      for (const account of state.accounts) {
        if (account.role !== 'customer') continue;
        const existing = byEmail.get(account.email) || {
          email: account.email,
          name: account.fullName,
          orderCount: 0,
          totalSpentPaise: 0,
          lastOrderAt: null,
        };
        existing.name = account.fullName;
        existing.status = account.status;
        existing.role = account.role;
        existing.createdAt = account.createdAt;
        byEmail.set(account.email, existing);
      }
      return clone([...byEmail.values()].sort((a, b) => b.totalSpentPaise - a.totalSpentPaise));
    },

    // ----- Inventory -----------------------------------------------------
    listInventory({ lowOnly = false } = {}) {
      const rows = [];
      for (const product of state.products) {
        for (const variant of product.variants) {
          const threshold = variant.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
          rows.push({
            variantId: variant.id,
            productId: product.id,
            productName: product.name,
            slug: product.slug,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            pricePaise: variant.pricePaise,
            stock: variant.stock,
            lowStockThreshold: threshold,
            lowStock: variant.stock <= threshold,
            outOfStock: variant.stock === 0,
          });
        }
      }
      const filtered = lowOnly ? rows.filter((r) => r.lowStock) : rows;
      return clone(filtered);
    },

    adjustInventory({ variantId, delta, reason, note }, actor) {
      const found = findVariant(variantId);
      if (!found) throw ApiError.notFound('Variant not found.');
      const next = found.variant.stock + delta;
      if (next < 0) {
        throw ApiError.unprocessable('That adjustment would make stock negative.', {
          delta: 'Not enough stock for this adjustment.',
        });
      }
      found.variant.stock = next;
      const movement = recordMovement({
        variantId,
        productId: found.product.id,
        delta,
        reason,
        note,
        actor,
        balanceAfter: next,
      });
      recordAudit(actor, 'inventory.adjust', 'variant', variantId, `${delta} (${reason})`);
      return { variant: clone(found.variant), movement: clone(movement) };
    },

    listMovements({ variantId } = {}) {
      const items = variantId
        ? state.inventoryMovements.filter((m) => m.variantId === variantId)
        : state.inventoryMovements;
      return clone(items.slice(0, 200));
    },

    // ----- Banners / content --------------------------------------------
    listBanners({ includeInactive = false } = {}) {
      const items = includeInactive ? state.banners : state.banners.filter((b) => b.active);
      return clone([...items].sort((a, b) => a.order - b.order));
    },

    // ----- Settings / audit ---------------------------------------------
    getSettings() {
      return clone(state.settings);
    },

    listAuditLogs() {
      return clone(state.auditLogs.slice(0, 200));
    },

    // ----- Accounts ------------------------------------------------------
    authenticate(email, password) {
      const account = state.accounts.find((a) => a.email === email.toLowerCase());
      if (!account) return null;
      if (credentials.get(account.id) !== password) return null;
      if (account.status !== 'active') return { disabled: true, account: clone(account) };
      return { account: clone(account) };
    },

    getAccountById(id) {
      const account = state.accounts.find((a) => a.id === id);
      return account ? clone(account) : null;
    },

    getAccountByEmail(email) {
      const account = state.accounts.find((a) => a.email === email.toLowerCase());
      return account ? clone(account) : null;
    },

    register({ fullName, email, password }) {
      if (state.accounts.some((a) => a.email === email.toLowerCase())) {
        throw ApiError.conflict('An account with this email already exists.', { email: 'Email already registered.' });
      }
      const account = {
        id: generateId('user'),
        email: email.toLowerCase(),
        fullName,
        role: 'customer',
        status: 'active',
        createdAt: nowISO(),
      };
      state.accounts.push(account);
      credentials.set(account.id, password);
      return clone(account);
    },

    // ----- Analytics -----------------------------------------------------
    getAnalytics() {
      const paidOrders = state.orders.filter((o) => o.paymentStatus === 'paid');
      const refundedOrders = state.orders.filter((o) => o.status === 'refunded');
      const grossRevenuePaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const refundedPaise = refundedOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const netRevenuePaise = grossRevenuePaise - refundedPaise;
      const aovPaise = paidOrders.length ? Math.round(grossRevenuePaise / paidOrders.length) : 0;

      const bestsellerMap = new Map();
      for (const order of state.orders) {
        if (['cancelled'].includes(order.status)) continue;
        for (const item of order.items) {
          const current = bestsellerMap.get(item.productId) || {
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            units: 0,
            revenuePaise: 0,
          };
          current.units += item.quantity;
          current.revenuePaise += multiplyPaise(item.unitPrice, item.quantity);
          bestsellerMap.set(item.productId, current);
        }
      }
      const bestselling = [...bestsellerMap.values()].sort((a, b) => b.units - a.units).slice(0, 5);

      const trendDays = 14;
      const trend = [];
      for (let i = trendDays - 1; i >= 0; i -= 1) {
        const day = new Date(Date.now() - i * 86400000);
        const key = day.toISOString().slice(0, 10);
        const dayOrders = paidOrders.filter((o) => o.createdAt.slice(0, 10) === key);
        trend.push({
          date: key,
          revenuePaise: dayOrders.reduce((sum, o) => sum + o.totalPaise, 0),
          orders: dayOrders.length,
        });
      }

      const inventory = provider.listInventory();
      return {
        mode: state.mode,
        grossRevenuePaise,
        refundedPaise,
        netRevenuePaise,
        revenuePaise: netRevenuePaise,
        orderCount: state.orders.length,
        paidOrderCount: paidOrders.length,
        aovPaise,
        publishedProductCount: state.products.filter((p) => p.status === 'published').length,
        draftProductCount: state.products.filter((p) => p.status === 'draft').length,
        customerCount: provider.listCustomers().length,
        lowStockCount: inventory.filter((r) => r.lowStock).length,
        outOfStockCount: inventory.filter((r) => r.outOfStock).length,
        statusBreakdown: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(
          (status) => ({ status, count: state.orders.filter((o) => o.status === status).length }),
        ),
        bestsellers: bestselling,
        revenueTrend: trend,
        recentOrders: clone(state.orders.slice(0, 6)),
      };
    },

    // exposed for tests only
    _reset() {
      state.orders.length = 0;
      state.cart.clear();
      state.inventoryMovements.length = 0;
      state.auditLogs.length = 0;
      seedOrders();
    },
  };

  return provider;
}
