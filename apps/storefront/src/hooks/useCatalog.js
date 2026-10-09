import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: catalog.fetchBanners,
    staleTime: 5 * 60_000,
  });
}

export function useProductReviews(slug) {
  return useQuery({
    queryKey: ['product', slug, 'reviews'],
    queryFn: () => catalog.fetchProductReviews(slug),
    enabled: Boolean(slug),
  });
}

export function useCreateReview(slug) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => catalog.createProductReview(slug, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', slug, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
    },
  });
}
