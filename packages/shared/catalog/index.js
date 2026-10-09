/**
 * Pure catalog helpers: price ranges, availability, search, filtering,
 * sorting, facets and pagination. Shared by the storefront and (for search)
 * the admin product list, so behaviour stays consistent.
 */

export function getProductPriceRange(product) {
  const prices = (product.variants || []).map((v) => v.pricePaise);
  if (prices.length === 0) {
    return { minPricePaise: 0, maxPricePaise: 0 };
  }
  return {
    minPricePaise: Math.min(...prices),
    maxPricePaise: Math.max(...prices),
  };
}

export function getProductCompareAtRange(product) {
  const prices = (product.variants || [])
    .map((v) => v.compareAtPaise)
    .filter((v) => typeof v === 'number');
  if (prices.length === 0) return { minCompareAtPaise: null, maxCompareAtPaise: null };
  return {
    minCompareAtPaise: Math.min(...prices),
    maxCompareAtPaise: Math.max(...prices),
  };
}

export function totalStock(product) {
  return (product.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function isInStock(product) {
  return totalStock(product) > 0;
}

export function discountPercent(pricePaise, compareAtPaise) {
  if (!compareAtPaise || compareAtPaise <= pricePaise) return 0;
  return Math.round(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}

export function availableSizes(product) {
  return [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];
}

export function availableColors(product) {
  return [...new Set((product.variants || []).map((v) => v.color).filter(Boolean))];
}

function matchesQuery(product, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    product.name,
    product.description,
    product.categoryName,
    ...(product.tags || []),
    ...(product.collections || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Filter products by a criteria object. Undefined/empty criteria are ignored.
 */
export function filterProducts(products, criteria = {}) {
  const {
    q,
    categories = [],
    sizes = [],
    colors = [],
    minPricePaise,
    maxPricePaise,
    inStockOnly = false,
    collection,
  } = criteria;

  return products.filter((product) => {
    if (!matchesQuery(product, q)) return false;
    if (categories.length && !categories.includes(product.categorySlug)) return false;
    if (collection && !(product.collections || []).includes(collection)) return false;
    if (sizes.length) {
      const productSizes = availableSizes(product);
      if (!sizes.some((s) => productSizes.includes(s))) return false;
    }
    if (colors.length) {
      const productColors = availableColors(product);
      if (!colors.some((c) => productColors.includes(c))) return false;
    }
    const { minPricePaise: productMin, maxPricePaise: productMax } = getProductPriceRange(product);
    if (typeof minPricePaise === 'number' && productMax < minPricePaise) return false;
    if (typeof maxPricePaise === 'number' && productMin > maxPricePaise) return false;
    if (inStockOnly && !isInStock(product)) return false;
    return true;
  });
}

export function sortProducts(products, sort = 'featured') {
  const copy = [...products];
  switch (sort) {
    case 'price-asc':
      return copy.sort((a, b) => getProductPriceRange(a).minPricePaise - getProductPriceRange(b).minPricePaise);
    case 'price-desc':
      return copy.sort((a, b) => getProductPriceRange(b).minPricePaise - getProductPriceRange(a).minPricePaise);
    case 'newest':
      return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case 'popularity':
      return copy.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    case 'featured':
    default:
      return copy.sort((a, b) => {
        if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      });
  }
}

export function paginate(items, page = 1, pageSize = 12) {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.max(1, Math.floor(pageSize) || 12);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const start = (safePage - 1) * safeSize;
  return {
    items: items.slice(start, start + safeSize),
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
  };
}

export function deriveFacets(products) {
  const categoryCounts = new Map();
  const sizeSet = new Set();
  const colorSet = new Set();
  let min = Infinity;
  let max = 0;
  for (const product of products) {
    categoryCounts.set(product.categorySlug, (categoryCounts.get(product.categorySlug) || 0) + 1);
    for (const size of availableSizes(product)) sizeSet.add(size);
    for (const color of availableColors(product)) colorSet.add(color);
    const range = getProductPriceRange(product);
    if (Number.isFinite(range.minPricePaise)) min = Math.min(min, range.minPricePaise);
    max = Math.max(max, range.maxPricePaise);
  }
  return {
    categories: [...categoryCounts.entries()].map(([slug, count]) => ({ slug, count })),
    sizes: [...sizeSet],
    colors: [...colorSet],
    priceRange: { minPaise: Number.isFinite(min) ? min : 0, maxPaise: max },
  };
}
