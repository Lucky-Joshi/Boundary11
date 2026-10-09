import {
  filterProducts,
  sortProducts,
  paginate,
  getProductPriceRange,
  getProductCompareAtRange,
  isInStock,
  totalStock,
  availableSizes,
  availableColors,
  discountPercent,
  DEFAULT_PAGE_SIZE,
} from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { slugify } from '../../utils/ids.js';

function categoryMap() {
  const map = new Map();
  for (const category of getProvider().listCategories()) map.set(category.slug, category.name);
  return map;
}

export function serializeProduct(product, names = categoryMap()) {
  const range = getProductPriceRange(product);
  const compare = getProductCompareAtRange(product);
  return {
    ...product,
    categoryName: names.get(product.categorySlug) || product.categorySlug,
    minPricePaise: range.minPricePaise,
    maxPricePaise: range.maxPricePaise,
    minCompareAtPaise: compare.minCompareAtPaise,
    maxCompareAtPaise: compare.maxCompareAtPaise,
    discountPercent: discountPercent(range.minPricePaise, compare.minCompareAtPaise),
    inStock: isInStock(product),
    totalStock: totalStock(product),
    availableSizes: availableSizes(product),
    availableColors: availableColors(product),
    primaryImage: product.images?.[0] || null,
  };
}

function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim()).filter(Boolean);
}

export function listProducts(query = {}, { includeUnpublished = false } = {}) {
  const provider = getProvider();
  const all = provider.listProducts({ includeUnpublished });
  const names = categoryMap();

  const filtered = filterProducts(all, {
    q: query.q,
    categories: toArray(query.category),
    sizes: toArray(query.size),
    colors: toArray(query.color),
    collection: query.collection,
    minPricePaise: query.minPrice,
    maxPricePaise: query.maxPrice,
    inStockOnly: query.inStock === true || query.inStock === 'true',
  });

  const sorted = sortProducts(filtered, query.sort || 'featured');
  const page = paginate(sorted, query.page || 1, query.pageSize || DEFAULT_PAGE_SIZE);

  return {
    ...page,
    items: page.items.map((product) => serializeProduct(product, names)),
  };
}

export function getProductBySlug(slug) {
  const product = getProvider().getProductBySlug(slug);
  if (!product) throw ApiError.notFound('Product not found.');
  return serializeProduct(product);
}

export function getProductById(id) {
  const product = getProvider().getProductById(id);
  if (!product) throw ApiError.notFound('Product not found.');
  return serializeProduct(product);
}

export function getRelatedProducts(slug, limit = 4) {
  const provider = getProvider();
  const product = provider.getProductBySlug(slug);
  if (!product) return [];
  const names = categoryMap();
  const pool = provider
    .listProducts()
    .filter((p) => p.slug !== slug)
    .map((p) => ({ product: p, score: (p.categorySlug === product.categorySlug ? 2 : 0) + (p.collections || []).filter((c) => (product.collections || []).includes(c)).length }));
  return pool
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product: p }) => serializeProduct(p, names));
}

export function createProduct(input, actor) {
  const payload = { ...input, slug: input.slug || slugify(input.name), _actor: actor };
  const created = getProvider().createProduct(payload);
  return serializeProduct(created);
}

export function updateProduct(id, input, actor) {
  const updated = getProvider().updateProduct(id, { ...input, _actor: actor });
  if (!updated) throw ApiError.notFound('Product not found.');
  return serializeProduct(updated);
}

export function setProductStatus(id, status, actor) {
  const updated = getProvider().setProductStatus(id, status, actor);
  if (!updated) throw ApiError.notFound('Product not found.');
  return serializeProduct(updated);
}

export function archiveProduct(id, actor) {
  const updated = getProvider().archiveProduct(id, actor);
  if (!updated) throw ApiError.notFound('Product not found.');
  return { id: updated.id, status: updated.status };
}
