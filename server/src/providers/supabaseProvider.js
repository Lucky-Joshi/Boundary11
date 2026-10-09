import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { generateOrderNumber, slugify, nowISO } from '../utils/ids.js';
import {
  computeTotals,
  multiplyPaise,
  DEFAULT_LOW_STOCK_THRESHOLD,
  canTransitionOrderStatus,
} from '@boundary11/shared';

/**
 * Supabase-backed provider (Milestone 2).
 *
 * Implements the same repository-style interface as the demo provider, but
 * every method is asynchronous because it talks to Postgres over PostgREST.
 * All services `await` provider calls, so the two providers are interchangeable.
 *
 * The service-role client is used for trusted server work; a separate anon
 * client is used only to verify credentials through Supabase Auth.
 */

let serviceClient = null;
let anonClient = null;

function service() {
  if (!serviceClient) {
    serviceClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

function anon() {
  if (!anonClient) {
    anonClient = createClient(env.supabase.url, env.supabase.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return anonClient;
}

/** Surface a PostgREST error as an ApiError, mapping unique violations to 409. */
function unwrap(result, message) {
  if (result.error) {
    if (result.error.code === '23505') {
      throw ApiError.conflict(message || 'A record with those details already exists.');
    }
    throw ApiError.internal(`Database error: ${result.error.message}`);
  }
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => UUID_RE.test(String(value || ''));
const num = (value) => (value == null ? null : Number(value));

const PRODUCT_SELECT = `
  id, slug, name, short_description, description, status, featured, tags, rating, review_count, accent, created_at,
  category:categories ( slug ),
  images:product_images ( url, alt, position ),
  variants:product_variants ( id, sku, size, color, price_paise, compare_at_paise, stock, low_stock_threshold ),
  collections:product_collections ( collection:collections ( slug ) )
`;

const CART_ITEM_SELECT = `
  variant_id, quantity,
  variant:product_variants (
    id, sku, size, color, price_paise, compare_at_paise, stock,
    product:products ( id, name, slug, status, images:product_images ( url, alt, position ) )
  )
`;

const ORDER_SELECT = `
  id, order_number, user_id, customer_name, contact_email, contact_phone, shipping_address,
  subtotal_paise, discount_paise, shipping_paise, total_paise, coupon_code, status, payment_status,
  payment_method, payment_ref, notes, idempotency_key, stock_released, created_at, updated_at,
  items:order_items (
    id, product_id, variant_id, name, slug, sku, size, color, unit_price_paise, quantity,
    product:products ( images:product_images ( url, alt, position ) )
  ),
  status_history:order_status_history ( status, note, actor, created_at )
`;

const firstImage = (images) => {
  if (!Array.isArray(images) || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return { url: sorted[0].url ?? null, alt: sorted[0].alt ?? '' };
};

function mapCategory(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    displayOrder: row.display_order,
  };
}

function mapCollection(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    accent: row.accent,
  };
}

function mapVariant(row) {
  return {
    id: row.id,
    sku: row.sku,
    size: row.size,
    color: row.color,
    pricePaise: Number(row.price_paise),
    compareAtPaise: num(row.compare_at_paise),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categorySlug: row.category?.slug || null,
    collections: (row.collections || []).map((pc) => pc.collection?.slug).filter(Boolean),
    tags: row.tags || [],
    shortDescription: row.short_description,
    description: row.description,
    status: row.status,
    featured: row.featured,
    rating: Number(row.rating || 0),
    reviewCount: row.review_count || 0,
    accent: row.accent,
    createdAt: row.created_at,
    images: [...(row.images || [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((img) => ({ url: img.url ?? null, alt: img.alt ?? '' })),
    variants: (row.variants || []).map(mapVariant),
  };
}

function mapCoupon(row) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minSubtotalPaise: Number(row.min_subtotal_paise || 0),
    maxDiscountPaise: num(row.max_discount_paise),
    active: row.active,
    expiresAt: row.expires_at,
    usageLimit: row.usage_limit,
    usedCount: row.used_count,
  };
}

function mapCartItem(row) {
  const variant = row.variant || {};
  const product = variant.product || {};
  return {
    id: variant.id,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    slug: product.slug,
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    unitPrice: Number(variant.price_paise),
    compareAtPaise: num(variant.compare_at_paise),
    quantity: row.quantity,
    stock: variant.stock,
    image: firstImage(product.images),
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    shippingAddress: row.shipping_address,
    items: (row.items || []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      variantId: item.variant_id,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      size: item.size,
      color: item.color,
      unitPrice: Number(item.unit_price_paise),
      quantity: item.quantity,
      image: firstImage(item.product?.images),
    })),
    subtotalPaise: Number(row.subtotal_paise),
    discountPaise: Number(row.discount_paise),
    shippingPaise: Number(row.shipping_paise),
    totalPaise: Number(row.total_paise),
    couponCode: row.coupon_code,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentRef: row.payment_ref,
    notes: row.notes,
    idempotencyKey: row.idempotency_key,
    stockReleased: Boolean(row.stock_released),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusHistory: (row.status_history || [])
      .map((h) => ({ status: h.status, note: h.note, at: h.created_at, actor: h.actor }))
      .sort((a, b) => new Date(a.at) - new Date(b.at)),
  };
}

function mapMovement(row) {
  return {
    id: row.id,
    variantId: row.variant_id,
    productId: row.product_id,
    delta: row.delta,
    reason: row.reason,
    note: row.note,
    actor: row.actor,
    balanceAfter: row.balance_after,
    createdAt: row.created_at,
  };
}

function mapAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    authorName: row.author_name,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status,
    productName: row.product?.name || '',
    productSlug: row.product?.slug || '',
    createdAt: row.created_at,
  };
}

function mapContactMessage(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSubscriber(row) {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export function createSupabaseProvider() {
  const provider = {
    mode: 'supabase',

    // ----- Catalog -------------------------------------------------------
    async listCategories() {
      const data = unwrap(
        await service().from('categories').select('*').order('display_order', { ascending: true }),
      );
      return data.map(mapCategory);
    },

    async listCollections() {
      const data = unwrap(await service().from('collections').select('*').order('name'));
      return data.map(mapCollection);
    },

    async getCollection(slug) {
      const { data, error } = await service().from('collections').select('*').eq('slug', slug).maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapCollection(data) : null;
    },

    async listProducts({ includeUnpublished = false } = {}) {
      let query = service().from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false });
      if (!includeUnpublished) query = query.eq('status', 'published');
      const data = unwrap(await query);
      return data.map(mapProduct);
    },

    async getProductBySlug(slug) {
      const { data, error } = await service()
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapProduct(data) : null;
    },

    async getProductById(id) {
      const { data, error } = await service()
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapProduct(data) : null;
    },

    async _categoryIdBySlug(slug) {
      const { data, error } = await service().from('categories').select('id').eq('slug', slug).maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!data) throw ApiError.badRequest('That category does not exist.', { categorySlug: 'Category not found.' });
      return data.id;
    },

    async _insertImages(productId, images) {
      const rows = (images?.length ? images : [{ url: null, alt: '' }]).map((img, index) => ({
        product_id: productId,
        url: img.url ?? null,
        alt: img.alt ?? '',
        position: index,
      }));
      unwrap(await service().from('product_images').insert(rows));
    },

    async _replaceCollections(productId, slugs) {
      unwrap(await service().from('product_collections').delete().eq('product_id', productId));
      const list = Array.isArray(slugs) ? slugs.filter(Boolean) : [];
      if (list.length === 0) return;
      const { data, error } = await service().from('collections').select('id, slug').in('slug', list);
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      const rows = (data || []).map((c) => ({ product_id: productId, collection_id: c.id }));
      if (rows.length) unwrap(await service().from('product_collections').insert(rows));
    },

    async createProduct(input) {
      const slug = input.slug || slugify(input.name);
      const categoryId = await provider._categoryIdBySlug(input.categorySlug);

      const { data: product, error } = await service()
        .from('products')
        .insert({
          slug,
          name: input.name,
          short_description: input.shortDescription || '',
          description: input.description,
          category_id: categoryId,
          status: input.status || 'draft',
          featured: Boolean(input.featured),
          tags: input.tags || [],
          accent: input.accent || '#1d2b53',
        })
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          throw ApiError.conflict('A product with this slug already exists.', { slug: 'Slug must be unique.' });
        }
        throw ApiError.internal(`Database error: ${error.message}`);
      }

      await provider._insertImages(product.id, input.images);

      const variants = input.variants || [];
      if (variants.length) {
        const { data: variantRows, error: variantError } = await service()
          .from('product_variants')
          .insert(
            variants.map((v) => ({
              product_id: product.id,
              sku: v.sku,
              size: v.size,
              color: v.color,
              price_paise: v.pricePaise,
              compare_at_paise: v.compareAtPaise ?? null,
              stock: v.stock ?? 0,
              low_stock_threshold: v.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
            })),
          )
          .select('id, stock, sku');
        if (variantError) {
          if (variantError.code === '23505') {
            throw ApiError.conflict('A variant with one of those SKUs already exists.', { sku: 'SKU must be unique.' });
          }
          throw ApiError.internal(`Database error: ${variantError.message}`);
        }
        if (variantRows.length) {
          unwrap(
            await service().from('inventory_movements').insert(
              variantRows.map((v) => ({
                variant_id: v.id,
                product_id: product.id,
                delta: v.stock,
                reason: 'restock',
                note: 'Initial stock',
                actor: input._actor || 'system',
                balance_after: v.stock,
              })),
            ),
          );
        }
      }

      await provider._replaceCollections(product.id, input.collections);
      unwrap(
        await service().from('audit_logs').insert({
          actor: input._actor || 'system',
          action: 'product.create',
          entity: 'product',
          entity_id: product.id,
          detail: input.name,
        }),
      );
      return provider.getProductById(product.id);
    },

    async updateProduct(id, input) {
      const existing = await provider.getProductById(id);
      if (!existing) return null;

      const patch = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.slug !== undefined) patch.slug = input.slug;
      if (input.categorySlug !== undefined) patch.category_id = await provider._categoryIdBySlug(input.categorySlug);
      if (input.shortDescription !== undefined) patch.short_description = input.shortDescription;
      if (input.description !== undefined) patch.description = input.description;
      if (input.status !== undefined) patch.status = input.status;
      if (input.featured !== undefined) patch.featured = Boolean(input.featured);
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.accent !== undefined) patch.accent = input.accent;

      if (Object.keys(patch).length) {
        const { error } = await service().from('products').update(patch).eq('id', id);
        if (error) {
          if (error.code === '23505') {
            throw ApiError.conflict('A product with this slug already exists.', { slug: 'Slug must be unique.' });
          }
          throw ApiError.internal(`Database error: ${error.message}`);
        }
      }

      if (Array.isArray(input.images)) {
        unwrap(await service().from('product_images').delete().eq('product_id', id));
        await provider._insertImages(id, input.images);
      }

      if (Array.isArray(input.variants)) {
        const previousById = new Map(existing.variants.map((v) => [v.id, v]));
        const incomingIds = new Set(input.variants.map((v) => v.id).filter(Boolean));

        for (const variant of input.variants) {
          if (variant.id && previousById.has(variant.id)) {
            const before = previousById.get(variant.id);
            const { error } = await service()
              .from('product_variants')
              .update({
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                price_paise: variant.pricePaise,
                compare_at_paise: variant.compareAtPaise ?? null,
                stock: variant.stock ?? before.stock,
                low_stock_threshold: variant.lowStockThreshold ?? before.lowStockThreshold,
              })
              .eq('id', variant.id);
            if (error) throw ApiError.internal(`Database error: ${error.message}`);
            const nextStock = variant.stock ?? before.stock;
            if (nextStock !== before.stock) {
              unwrap(
                await service().from('inventory_movements').insert({
                  variant_id: variant.id,
                  product_id: id,
                  delta: nextStock - before.stock,
                  reason: 'correction',
                  note: 'Product edit',
                  actor: input._actor || 'system',
                  balance_after: nextStock,
                }),
              );
            }
          } else {
            const { data: created, error } = await service()
              .from('product_variants')
              .insert({
                product_id: id,
                sku: variant.sku,
                size: variant.size,
                color: variant.color,
                price_paise: variant.pricePaise,
                compare_at_paise: variant.compareAtPaise ?? null,
                stock: variant.stock ?? 0,
                low_stock_threshold: variant.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
              })
              .select('id, stock')
              .single();
            if (error) throw ApiError.internal(`Database error: ${error.message}`);
            unwrap(
              await service().from('inventory_movements').insert({
                variant_id: created.id,
                product_id: id,
                delta: created.stock,
                reason: 'restock',
                note: 'New variant',
                actor: input._actor || 'system',
                balance_after: created.stock,
              }),
            );
          }
        }

        const removed = existing.variants.filter((v) => !incomingIds.has(v.id)).map((v) => v.id);
        if (removed.length) unwrap(await service().from('product_variants').delete().in('id', removed));
      }

      if (Array.isArray(input.collections)) {
        await provider._replaceCollections(id, input.collections);
      }

      unwrap(
        await service().from('audit_logs').insert({
          actor: input._actor || 'system',
          action: 'product.update',
          entity: 'product',
          entity_id: id,
          detail: patch.name || existing.name,
        }),
      );
      return provider.getProductById(id);
    },

    async setProductStatus(id, status, actor) {
      const { data, error } = await service().from('products').update({ status }).eq('id', id).select('id').maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!data) return null;
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'product.status',
          entity: 'product',
          entity_id: id,
          detail: status,
        }),
      );
      return provider.getProductById(id);
    },

    async archiveProduct(id, actor) {
      const { data, error } = await service()
        .from('products')
        .update({ status: 'archived' })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!data) return null;
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'product.archive',
          entity: 'product',
          entity_id: id,
          detail: '',
        }),
      );
      return { id, status: 'archived' };
    },

    // ----- Cart ----------------------------------------------------------
    async _ensureCart(cartId) {
      const { error } = await service()
        .from('carts')
        .upsert({ id: cartId }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
    },

    async getCart(cartId) {
      const { data: cart } = await service().from('carts').select('id, updated_at').eq('id', cartId).maybeSingle();
      const data = unwrap(await service().from('cart_items').select(CART_ITEM_SELECT).eq('cart_id', cartId));
      return {
        id: cartId,
        items: data.map(mapCartItem),
        updatedAt: cart?.updated_at || nowISO(),
      };
    },

    async addCartItem(cartId, variantId, quantity) {
      await provider._ensureCart(cartId);
      const { data: variant, error } = await service()
        .from('product_variants')
        .select('id, stock, product:products ( status )')
        .eq('id', variantId)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!variant) throw ApiError.notFound('That variant no longer exists.');
      if (variant.product?.status !== 'published') {
        throw ApiError.unprocessable('That product is not currently available.');
      }
      const { data: existing } = await service()
        .from('cart_items')
        .select('quantity')
        .eq('cart_id', cartId)
        .eq('variant_id', variantId)
        .maybeSingle();
      const desired = (existing?.quantity || 0) + quantity;
      if (desired > variant.stock) {
        throw ApiError.unprocessable(`Only ${variant.stock} left in stock.`);
      }
      unwrap(
        await service()
          .from('cart_items')
          .upsert({ cart_id: cartId, variant_id: variantId, quantity: desired }, { onConflict: 'cart_id,variant_id' }),
      );
      unwrap(await service().from('carts').update({ updated_at: nowISO() }).eq('id', cartId));
      return provider.getCart(cartId);
    },

    async updateCartItem(cartId, itemId, quantity) {
      const { data: variant, error } = await service()
        .from('product_variants')
        .select('id, stock')
        .eq('id', itemId)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (variant && quantity > variant.stock) {
        throw ApiError.unprocessable(`Only ${variant.stock} left in stock.`);
      }
      const { data, error: updateError } = await service()
        .from('cart_items')
        .update({ quantity })
        .eq('cart_id', cartId)
        .eq('variant_id', itemId)
        .select('variant_id');
      if (updateError) throw ApiError.internal(`Database error: ${updateError.message}`);
      if (!data || data.length === 0) throw ApiError.notFound('Cart item not found.');
      unwrap(await service().from('carts').update({ updated_at: nowISO() }).eq('id', cartId));
      return provider.getCart(cartId);
    },

    async removeCartItem(cartId, itemId) {
      unwrap(await service().from('cart_items').delete().eq('cart_id', cartId).eq('variant_id', itemId));
      unwrap(await service().from('carts').update({ updated_at: nowISO() }).eq('id', cartId));
      return provider.getCart(cartId);
    },

    async clearCart(cartId) {
      unwrap(await service().from('cart_items').delete().eq('cart_id', cartId));
      return provider.getCart(cartId);
    },

    // ----- Coupons -------------------------------------------------------
    async listCoupons() {
      const data = unwrap(await service().from('coupons').select('*').order('created_at', { ascending: false }));
      return data.map(mapCoupon);
    },

    async getCouponByCode(code) {
      const needle = String(code || '').trim().toUpperCase();
      if (!needle) return null;
      const { data, error } = await service().from('coupons').select('*').eq('code', needle).maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapCoupon(data) : null;
    },

    async createCoupon(input, actor) {
      const { data, error } = await service()
        .from('coupons')
        .insert({
          code: input.code,
          type: input.type,
          value: input.value,
          min_subtotal_paise: input.minSubtotalPaise ?? 0,
          max_discount_paise: input.maxDiscountPaise ?? null,
          active: input.active ?? true,
          expires_at: input.expiresAt ?? null,
          usage_limit: input.usageLimit ?? null,
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') throw ApiError.conflict('That coupon code already exists.', { code: 'Code must be unique.' });
        throw ApiError.internal(`Database error: ${error.message}`);
      }
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'coupon.create',
          entity: 'coupon',
          entity_id: data.id,
          detail: data.code,
        }),
      );
      return mapCoupon(data);
    },

    // ----- Orders --------------------------------------------------------
    async listOrders({ status, q, customerId } = {}) {
      let query = service().from('orders').select(ORDER_SELECT).order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      if (customerId) query = query.eq('user_id', customerId);
      if (q) query = query.or(`order_number.ilike.%${q}%,contact_email.ilike.%${q}%,customer_name.ilike.%${q}%`);
      const data = unwrap(await query);
      return data.map(mapOrder);
    },

    async getOrder(id) {
      const column = isUuid(id) ? 'id' : 'order_number';
      const { data, error } = await service()
        .from('orders')
        .select(ORDER_SELECT)
        .eq(column, id)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapOrder(data) : null;
    },

    async _orderIdForIdempotencyKey(key) {
      if (!key) return null;
      const { data, error } = await service()
        .from('orders')
        .select('id')
        .eq('idempotency_key', key)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data?.id ?? null;
    },

    async _decrementStock(line, actor) {
      const { data: current, error } = await service()
        .from('product_variants')
        .select('stock')
        .eq('id', line.variantId)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!current) throw ApiError.conflict('An item in your cart is no longer available.');
      const next = current.stock - line.quantity;
      if (next < 0) throw ApiError.conflict(`Only ${current.stock} of ${line.name} (${line.size}) left in stock.`);
      const { data: updated, error: updateError } = await service()
        .from('product_variants')
        .update({ stock: next })
        .eq('id', line.variantId)
        .eq('stock', current.stock)
        .select('id');
      if (updateError) throw ApiError.internal(`Database error: ${updateError.message}`);
      if (!updated || updated.length === 0) {
        throw ApiError.conflict('Stock changed while you were checking out. Please try again.');
      }
      unwrap(
        await service().from('inventory_movements').insert({
          variant_id: line.variantId,
          product_id: line.productId,
          delta: -line.quantity,
          reason: 'sale',
          note: 'Order placed',
          actor: actor || 'guest',
          balance_after: next,
        }),
      );
      return next;
    },

    /**
     * Create an order from a cart. Stock is validated, then decremented with an
     * optimistic compare-and-set so concurrent checkouts cannot oversell.
     *
     * Pass an `idempotencyKey` to make checkout retry-safe: replaying a request
     * with the same key returns the previously created order instead of creating
     * a duplicate and charging again (backed by `orders.idempotency_key`).
     */
    async createOrder({ cartId, contactEmail, contactPhone, shippingAddress, paymentMethod, couponCode, notes, userId, customerName, idempotencyKey }) {
      const key = idempotencyKey ? String(idempotencyKey).trim() : '';
      if (key) {
        const replay = await provider._orderIdForIdempotencyKey(key);
        if (replay) return provider.getOrder(replay);
      }

      const cart = await provider.getCart(cartId);
      if (!cart.items.length) throw ApiError.badRequest('Your cart is empty.');

      const variantIds = cart.items.map((i) => i.variantId);
      const { data: variantRows, error } = await service()
        .from('product_variants')
        .select('id, sku, size, color, price_paise, stock, product:products ( id, name, slug, status, images:product_images ( url, alt, position ) )')
        .in('id', variantIds);
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      const byId = new Map((variantRows || []).map((v) => [v.id, v]));

      const lines = cart.items.map((item) => {
        const variant = byId.get(item.variantId);
        if (!variant) throw ApiError.conflict('An item in your cart is no longer available.');
        if (variant.product?.status !== 'published') {
          throw ApiError.conflict(`${variant.product.name} is no longer available.`);
        }
        if (variant.stock < item.quantity) {
          throw ApiError.conflict(`Only ${variant.stock} of ${variant.product.name} (${variant.size}) left in stock.`);
        }
        return {
          productId: variant.product.id,
          variantId: variant.id,
          name: variant.product.name,
          slug: variant.product.slug,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          unitPrice: Number(variant.price_paise),
          quantity: item.quantity,
          image: firstImage(variant.product.images),
        };
      });

      const coupon = couponCode ? await provider.getCouponByCode(couponCode) : null;
      const totals = computeTotals(
        lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.quantity })),
        { coupon: coupon && coupon.active ? coupon : null },
      );
      if (couponCode && (!coupon || !coupon.active || !totals.couponQualifies)) {
        throw ApiError.unprocessable('That coupon is not valid for this order.', {
          couponCode: 'Coupon could not be applied.',
        });
      }

      const { data: order, error: orderError } = await service()
        .from('orders')
        .insert({
          order_number: generateOrderNumber(),
          user_id: userId || null,
          customer_name: customerName || shippingAddress.fullName,
          contact_email: contactEmail,
          contact_phone: contactPhone || '',
          shipping_address: shippingAddress,
          subtotal_paise: totals.subtotalPaise,
          discount_paise: totals.discountPaise,
          shipping_paise: totals.shippingPaise,
          total_paise: totals.totalPaise,
          coupon_code: totals.discountPaise > 0 ? coupon.code : null,
          status: 'pending',
          payment_status: 'pending',
          payment_method: paymentMethod,
          notes: notes || '',
          idempotency_key: key || null,
          stock_released: false,
        })
        .select('id')
        .single();
      if (orderError) {
        if (orderError.code === '23505' && key) {
          const replay = await provider._orderIdForIdempotencyKey(key);
          if (replay) return provider.getOrder(replay);
        }
        throw ApiError.internal(`Database error: ${orderError.message}`);
      }

      unwrap(
        await service().from('order_items').insert(
          lines.map((line) => ({
            order_id: order.id,
            product_id: line.productId,
            variant_id: line.variantId,
            name: line.name,
            slug: line.slug,
            sku: line.sku,
            size: line.size,
            color: line.color,
            unit_price_paise: line.unitPrice,
            quantity: line.quantity,
          })),
        ),
      );
      unwrap(
        await service().from('order_status_history').insert({
          order_id: order.id,
          status: 'pending',
          note: 'Order created',
          actor: userId || 'guest',
        }),
      );

      for (const line of lines) {
        await provider._decrementStock(line, userId);
      }

      if (order.coupon_code) {
        const used = await provider.getCouponByCode(order.coupon_code);
        if (used) {
          unwrap(
            await service()
              .from('coupons')
              .update({ used_count: (used.usedCount || 0) + 1 })
              .eq('id', used.id),
          );
        }
      }

      unwrap(await service().from('cart_items').delete().eq('cart_id', cartId));
      unwrap(await service().from('carts').delete().eq('id', cartId));
      unwrap(
        await service().from('audit_logs').insert({
          actor: userId || 'guest',
          action: 'order.create',
          entity: 'order',
          entity_id: order.id,
          detail: '',
        }),
      );
      return provider.getOrder(order.id);
    },

    async markOrderPaid(orderId, paymentRef) {
      const order = await provider.getOrder(orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      unwrap(
        await service()
          .from('orders')
          .update({ payment_status: 'paid', payment_ref: paymentRef, status: 'paid' })
          .eq('id', order.id),
      );
      unwrap(
        await service().from('order_status_history').insert({
          order_id: order.id,
          status: 'paid',
          note: 'Mock payment captured',
          actor: 'system',
        }),
      );
      return provider.getOrder(order.id);
    },

    async markPaymentFailed(orderId) {
      const order = await provider.getOrder(orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      unwrap(await service().from('orders').update({ payment_status: 'failed' }).eq('id', order.id));
      return provider.getOrder(order.id);
    },

    /**
     * Release reserved stock back for an order. Idempotent (the database
     * function guards on `orders.stock_released`). Used by cancellation
     * workflows so cancelled, unfulfilled orders put inventory back.
     */
    async releaseOrderStock(orderId, actor = 'system') {
      const order = await provider.getOrder(orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      if (order.stockReleased) return order;
      const { error } = await service().rpc('release_order_stock', {
        p_order_id: order.id,
        p_actor: actor || 'system',
      });
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return provider.getOrder(order.id);
    },

    async updateOrderStatus(orderId, status, note, actor) {
      const order = await provider.getOrder(orderId);
      if (!order) throw ApiError.notFound('Order not found.');
      if (!canTransitionOrderStatus(order.status, status)) {
        throw ApiError.unprocessable(`Cannot move an order from "${order.status}" to "${status}".`, {
          status: `Invalid transition from ${order.status}.`,
        });
      }
      const patch = { status };
      if (status === 'refunded') patch.payment_status = 'refunded';
      unwrap(await service().from('orders').update(patch).eq('id', order.id));
      unwrap(
        await service().from('order_status_history').insert({
          order_id: order.id,
          status,
          note: note || '',
          actor: actor || 'system',
        }),
      );
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'order.status',
          entity: 'order',
          entity_id: order.id,
          detail: `${order.orderNumber} -> ${status}`,
        }),
      );
      if (status === 'cancelled' && !order.stockReleased) {
        await provider.releaseOrderStock(order.id, actor);
      }
      return provider.getOrder(order.id);
    },

    // ----- Customers -----------------------------------------------------
    async listCustomers() {
      const orders = unwrap(
        await service()
          .from('orders')
          .select('contact_email, customer_name, payment_status, status, total_paise, created_at'),
      );
      const profiles = unwrap(
        await service().from('profiles').select('email, full_name, role, status, created_at').eq('role', 'customer'),
      );

      const byEmail = new Map();
      for (const order of orders) {
        const key = order.contact_email;
        const existing = byEmail.get(key) || {
          email: key,
          name: order.customer_name,
          orderCount: 0,
          totalSpentPaise: 0,
          lastOrderAt: null,
          status: 'active',
        };
        existing.orderCount += 1;
        if (order.payment_status === 'paid' && order.status !== 'refunded') {
          existing.totalSpentPaise += Number(order.total_paise);
        }
        if (!existing.lastOrderAt || new Date(order.created_at) > new Date(existing.lastOrderAt)) {
          existing.lastOrderAt = order.created_at;
        }
        byEmail.set(key, existing);
      }
      for (const profile of profiles) {
        const existing = byEmail.get(profile.email) || {
          email: profile.email,
          name: profile.full_name,
          orderCount: 0,
          totalSpentPaise: 0,
          lastOrderAt: null,
        };
        existing.name = profile.full_name;
        existing.status = profile.status;
        existing.role = profile.role;
        existing.createdAt = profile.created_at;
        byEmail.set(profile.email, existing);
      }
      return [...byEmail.values()].sort((a, b) => b.totalSpentPaise - a.totalSpentPaise);
    },

    async listStaff() {
      const data = unwrap(
        await service().from('profiles').select('email, full_name, role, status, created_at').in('role', ['admin', 'support']),
      );
      return data.map((row) => ({
        email: row.email,
        name: row.full_name,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
      }));
    },

    // ----- Inventory -----------------------------------------------------
    async listInventory({ lowOnly = false } = {}) {
      const data = unwrap(
        await service()
          .from('product_variants')
          .select(
            'id, product_id, sku, size, color, price_paise, stock, low_stock_threshold, product:products ( name, slug )',
          ),
      );
      const rows = data.map((row) => {
        const threshold = row.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
        return {
          variantId: row.id,
          productId: row.product_id,
          productName: row.product?.name || '',
          slug: row.product?.slug || '',
          sku: row.sku,
          size: row.size,
          color: row.color,
          pricePaise: Number(row.price_paise),
          stock: row.stock,
          lowStockThreshold: threshold,
          lowStock: row.stock <= threshold,
          outOfStock: row.stock === 0,
        };
      });
      return lowOnly ? rows.filter((r) => r.lowStock) : rows;
    },

    async adjustInventory({ variantId, delta, reason, note }, actor) {
      const { data: variant, error } = await service()
        .from('product_variants')
        .select('id, product_id, sku, size, color, price_paise, compare_at_paise, stock, low_stock_threshold')
        .eq('id', variantId)
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!variant) throw ApiError.notFound('Variant not found.');
      const next = variant.stock + delta;
      if (next < 0) {
        throw ApiError.unprocessable('That adjustment would make stock negative.', {
          delta: 'Not enough stock for this adjustment.',
        });
      }
      const { data: updated, error: updateError } = await service()
        .from('product_variants')
        .update({ stock: next })
        .eq('id', variantId)
        .eq('stock', variant.stock)
        .select('id, sku, size, color, price_paise, compare_at_paise, stock, low_stock_threshold');
      if (updateError) throw ApiError.internal(`Database error: ${updateError.message}`);
      if (!updated || updated.length === 0) {
        throw ApiError.conflict('Stock changed before the adjustment could be applied. Please retry.');
      }

      const movement = unwrap(
        await service()
          .from('inventory_movements')
          .insert({
            variant_id: variantId,
            product_id: variant.product_id,
            delta,
            reason,
            note: note || '',
            actor: actor || 'system',
            balance_after: next,
          })
          .select('*')
          .single(),
      );
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'inventory.adjust',
          entity: 'variant',
          entity_id: variantId,
          detail: `${delta} (${reason})`,
        }),
      );
      return { variant: mapVariant(updated[0]), movement: mapMovement(movement) };
    },

    async listMovements({ variantId } = {}) {
      let query = service().from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(200);
      if (variantId) query = query.eq('variant_id', variantId);
      const data = unwrap(await query);
      return data.map(mapMovement);
    },

    // ----- Banners / content --------------------------------------------
    async listBanners({ includeInactive = false } = {}) {
      let query = service().from('banners').select('*').order('order', { ascending: true });
      if (!includeInactive) query = query.eq('active', true);
      const data = unwrap(await query);
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        ctaLabel: row.cta_label,
        ctaHref: row.cta_href,
        accent: row.accent,
        active: row.active,
        order: row.order,
      }));
    },

    // ----- Settings / audit ---------------------------------------------
    async getSettings() {
      const data = unwrap(await service().from('settings').select('key, value'));
      const settings = {};
      for (const row of data) {
        if (row.value && typeof row.value === 'object' && !Array.isArray(row.value)) {
          Object.assign(settings, row.value);
        } else {
          settings[row.key] = row.value;
        }
      }
      return settings;
    },

    async listAuditLogs() {
      const data = unwrap(
        await service().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      );
      return data.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        detail: row.detail,
        createdAt: row.created_at,
      }));
    },

    // ----- Accounts ------------------------------------------------------
    async authenticate(email, password) {
      const { data, error } = await anon().auth.signInWithPassword({ email, password });
      if (error || !data?.user) return null;
      const account = await provider.getAccountById(data.user.id);
      if (!account) {
        const fullName = data.user.user_metadata?.full_name || email;
        return { account: { id: data.user.id, email: data.user.email, fullName, role: 'customer', status: 'active', createdAt: data.user.created_at } };
      }
      if (account.status !== 'active') return { disabled: true, account };
      return { account };
    },

    async getAccountById(id) {
      const { data, error } = await service().from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return mapAccount(data);
    },

    async getAccountByEmail(email) {
      const { data, error } = await service().from('profiles').select('*').eq('email', String(email).toLowerCase()).maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return mapAccount(data);
    },

    async register({ fullName, email, password }) {
      const normalized = String(email).toLowerCase();
      const { data, error } = await service().auth.admin.createUser({
        email: normalized,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) {
        if (/already/i.test(error.message)) {
          throw ApiError.conflict('An account with this email already exists.', { email: 'Email already registered.' });
        }
        throw ApiError.internal(`Auth error: ${error.message}`);
      }
      await service().from('profiles').upsert(
        { id: data.user.id, email: normalized, full_name: fullName, role: 'customer', status: 'active' },
        { onConflict: 'id' },
      );
      return provider.getAccountById(data.user.id);
    },

    // ----- Reviews -------------------------------------------------------
    async listReviews({ productId, status } = {}) {
      let query = service()
        .from('reviews')
        .select('*, product:products ( name, slug )')
        .order('created_at', { ascending: false });
      if (productId) query = query.eq('product_id', productId);
      if (status) query = query.eq('status', status);
      const data = unwrap(await query);
      return data.map(mapReview);
    },

    async createReview({ productId, userId, authorName, rating, title, body }) {
      const product = await provider.getProductById(productId);
      if (!product) throw ApiError.notFound('Product not found.');
      const { data, error } = await service()
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: userId || null,
          author_name: authorName || 'Boundary11 fan',
          rating,
          title: title || '',
          body,
        })
        .select('*')
        .single();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);

      const priorCount = product.reviewCount || 0;
      const priorRating = product.rating || 0;
      const nextCount = priorCount + 1;
      const nextRating = Math.round(((priorRating * priorCount + rating) / nextCount) * 10) / 10;
      unwrap(
        await service()
          .from('products')
          .update({ review_count: nextCount, rating: nextRating })
          .eq('id', productId),
      );
      unwrap(
        await service().from('audit_logs').insert({
          actor: userId || 'guest',
          action: 'review.create',
          entity: 'product',
          entity_id: productId,
          detail: `${rating} star`,
        }),
      );
      return mapReview(data);
    },

    async setReviewStatus(id, status, actor) {
      const { data, error } = await service()
        .from('reviews')
        .update({ status })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      if (!data) return null;
      unwrap(
        await service().from('audit_logs').insert({
          actor: actor || 'system',
          action: 'review.status',
          entity: 'review',
          entity_id: id,
          detail: status,
        }),
      );
      return mapReview(data);
    },

    // ----- Contact + newsletter -----------------------------------------
    async listContactMessages() {
      const data = unwrap(
        await service().from('contact_messages').select('*').order('created_at', { ascending: false }),
      );
      return data.map(mapContactMessage);
    },

    async createContactMessage(input) {
      const { data, error } = await service()
        .from('contact_messages')
        .insert({ name: input.name, email: input.email, subject: input.subject, message: input.message })
        .select('*')
        .single();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return mapContactMessage(data);
    },

    async setContactMessageStatus(id, status) {
      const { data, error } = await service()
        .from('contact_messages')
        .update({ status })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw ApiError.internal(`Database error: ${error.message}`);
      return data ? mapContactMessage(data) : null;
    },

    async listNewsletterSubscribers() {
      const data = unwrap(
        await service().from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
      );
      return data.map(mapSubscriber);
    },

    async subscribeNewsletter(email) {
      const normalized = String(email).trim().toLowerCase();
      const { data: existing } = await service()
        .from('newsletter_subscribers')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();
      if (existing) return { subscriber: mapSubscriber(existing), already: true };
      const { data, error } = await service()
        .from('newsletter_subscribers')
        .insert({ email: normalized })
        .select('*')
        .single();
      if (error) {
        if (error.code === '23505') {
          const { data: again } = await service()
            .from('newsletter_subscribers')
            .select('*')
            .eq('email', normalized)
            .maybeSingle();
          return { subscriber: mapSubscriber(again), already: true };
        }
        throw ApiError.internal(`Database error: ${error.message}`);
      }
      return { subscriber: mapSubscriber(data), already: false };
    },

    // ----- Analytics -----------------------------------------------------
    async getAnalytics() {
      const orders = await provider.listOrders();
      const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
      const refundedOrders = orders.filter((o) => o.status === 'refunded');
      const grossRevenuePaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const refundedPaise = refundedOrders.reduce((sum, o) => sum + o.totalPaise, 0);
      const netRevenuePaise = grossRevenuePaise - refundedPaise;
      const aovPaise = paidOrders.length ? Math.round(grossRevenuePaise / paidOrders.length) : 0;

      const bestsellerMap = new Map();
      for (const order of orders) {
        if (order.status === 'cancelled') continue;
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

      const trend = [];
      for (let i = 13; i >= 0; i -= 1) {
        const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const dayOrders = paidOrders.filter((o) => o.createdAt.slice(0, 10) === key);
        trend.push({
          date: key,
          revenuePaise: dayOrders.reduce((sum, o) => sum + o.totalPaise, 0),
          orders: dayOrders.length,
        });
      }

      const inventory = await provider.listInventory();
      const products = await provider.listProducts({ includeUnpublished: true });
      const customers = await provider.listCustomers();
      return {
        mode: 'supabase',
        grossRevenuePaise,
        refundedPaise,
        netRevenuePaise,
        revenuePaise: netRevenuePaise,
        orderCount: orders.length,
        paidOrderCount: paidOrders.length,
        aovPaise,
        publishedProductCount: products.filter((p) => p.status === 'published').length,
        draftProductCount: products.filter((p) => p.status === 'draft').length,
        customerCount: customers.length,
        lowStockCount: inventory.filter((r) => r.lowStock).length,
        outOfStockCount: inventory.filter((r) => r.outOfStock).length,
        statusBreakdown: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map(
          (status) => ({ status, count: orders.filter((o) => o.status === status).length }),
        ),
        bestsellers: bestselling,
        revenueTrend: trend,
        recentOrders: [...orders]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 6),
      };
    },
  };

  return provider;
}
