import { describe, it, expect } from 'vitest';
import {
  filterProducts,
  sortProducts,
  paginate,
  deriveFacets,
  getProductPriceRange,
  isInStock,
  discountPercent,
} from '../catalog/index.js';

const makeProduct = (overrides) => ({
  id: overrides.slug,
  name: overrides.name,
  slug: overrides.slug,
  description: 'A fine piece of cricket merchandise for testing.',
  categorySlug: overrides.categorySlug,
  categoryName: overrides.categoryName || overrides.categorySlug,
  collections: overrides.collections || [],
  tags: overrides.tags || [],
  featured: overrides.featured || false,
  reviewCount: overrides.reviewCount || 0,
  createdAt: overrides.createdAt || '2024-01-01T00:00:00.000Z',
  variants: overrides.variants,
});

const products = [
  makeProduct({
    slug: 'home-jersey',
    name: 'Home Jersey',
    categorySlug: 'jerseys',
    featured: true,
    reviewCount: 120,
    createdAt: '2024-06-01T00:00:00.000Z',
    collections: ['matchday'],
    tags: ['jersey', 'cotton'],
    variants: [
      { id: 'a', sku: 'HJ-M', size: 'M', color: 'Blue', pricePaise: 149900, compareAtPaise: 199900, stock: 5 },
      { id: 'b', sku: 'HJ-L', size: 'L', color: 'Blue', pricePaise: 149900, stock: 0 },
    ],
  }),
  makeProduct({
    slug: 'field-cap',
    name: 'Field Cap',
    categorySlug: 'caps',
    reviewCount: 40,
    createdAt: '2024-05-01T00:00:00.000Z',
    tags: ['cap'],
    variants: [{ id: 'c', sku: 'FC-OS', size: 'OS', color: 'Navy', pricePaise: 99900, stock: 3 }],
  }),
  makeProduct({
    slug: 'tour-hoodie',
    name: 'Tour Hoodie',
    categorySlug: 'hoodies',
    reviewCount: 80,
    createdAt: '2024-07-01T00:00:00.000Z',
    collections: ['matchday'],
    variants: [{ id: 'd', sku: 'TH-L', size: 'L', color: 'Grey', pricePaise: 249900, stock: 2 }],
  }),
];

describe('catalog', () => {
  it('computes price ranges', () => {
    expect(getProductPriceRange(products[0])).toEqual({ minPricePaise: 149900, maxPricePaise: 149900 });
  });

  it('detects in-stock products across variants', () => {
    expect(isInStock(products[0])).toBe(true);
    expect(isInStock({ variants: [{ stock: 0 }] })).toBe(false);
  });

  it('computes discount percent', () => {
    expect(discountPercent(149900, 199900)).toBe(25);
    expect(discountPercent(99900, null)).toBe(0);
  });

  it('filters by search query', () => {
    expect(filterProducts(products, { q: 'jersey' })).toHaveLength(1);
  });

  it('filters by category', () => {
    expect(filterProducts(products, { categories: ['caps'] })).toHaveLength(1);
  });

  it('filters by collection', () => {
    expect(filterProducts(products, { collection: 'matchday' })).toHaveLength(2);
  });

  it('filters by size', () => {
    expect(filterProducts(products, { sizes: ['OS'] })).toHaveLength(1);
  });

  it('filters by price range', () => {
    expect(filterProducts(products, { minPricePaise: 200000 })).toHaveLength(1);
    expect(filterProducts(products, { maxPricePaise: 120000 })).toHaveLength(1);
  });

  it('filters by stock only', () => {
    const onlyStocked = filterProducts(
      [...products, { ...products[0], slug: 'sold-out', variants: [{ pricePaise: 100, stock: 0 }] }],
      { inStockOnly: true },
    );
    expect(onlyStocked.find((p) => p.slug === 'sold-out')).toBeUndefined();
  });

  it('sorts by price ascending and descending', () => {
    const asc = sortProducts(products, 'price-asc').map((p) => p.slug);
    expect(asc).toEqual(['field-cap', 'home-jersey', 'tour-hoodie']);
    const desc = sortProducts(products, 'price-desc').map((p) => p.slug);
    expect(desc[0]).toBe('tour-hoodie');
  });

  it('sorts by newest', () => {
    expect(sortProducts(products, 'newest')[0].slug).toBe('tour-hoodie');
  });

  it('sorts by popularity', () => {
    expect(sortProducts(products, 'popularity')[0].slug).toBe('home-jersey');
  });

  it('paginates results', () => {
    const page = paginate(products, 1, 2);
    expect(page.items).toHaveLength(2);
    expect(page.totalPages).toBe(2);
    expect(page.hasNext).toBe(true);
    expect(page.hasPrev).toBe(false);
  });

  it('derives facets', () => {
    const facets = deriveFacets(products);
    expect(facets.sizes).toContain('M');
    expect(facets.categories.find((c) => c.slug === 'jerseys').count).toBe(1);
  });
});
