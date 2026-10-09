import { useQuery } from '@tanstack/react-query';
import * as catalog from '../services/catalog.js';

export function useProducts(params) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => catalog.fetchProducts(params),
    placeholderData: (previous) => previous,
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalog.fetchProduct(slug),
    enabled: Boolean(slug),
  });
}

export function useRelatedProducts(slug) {
  return useQuery({
    queryKey: ['product', slug, 'related'],
    queryFn: () => catalog.fetchRelated(slug),
    enabled: Boolean(slug),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalog.fetchCategories,
    staleTime: 5 * 60_000,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: catalog.fetchCollections,
    staleTime: 5 * 60_000,
  });
}

export function useCollection(slug) {
  return useQuery({
    queryKey: ['collection', slug],
    queryFn: () => catalog.fetchCollection(slug),
    enabled: Boolean(slug),
  });
}
