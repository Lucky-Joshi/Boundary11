import { api } from './api.js';

export function fetchProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    if (Array.isArray(value)) {
      if (value.length) query.set(key, value.join(','));
    } else {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return api.get(`/products${qs ? `?${qs}` : ''}`);
}

export function fetchProduct(slug) {
  return api.get(`/products/${slug}`);
}

export function fetchRelated(slug) {
  return api.get(`/products/${slug}/related`);
}

export function fetchCategories() {
  return api.get('/categories');
}

export function fetchCollections() {
  return api.get('/collections');
}

export function fetchCollection(slug) {
  return api.get(`/collections/${slug}`);
}
