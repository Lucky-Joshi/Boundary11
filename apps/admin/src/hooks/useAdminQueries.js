import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi.js';

export const keys = {
  analytics: ['admin', 'analytics'],
  products: (params) => ['admin', 'products', params],
  product: (id) => ['admin', 'product', id],
  categories: ['admin', 'categories'],
  orders: (params) => ['admin', 'orders', params],
  order: (id) => ['admin', 'order', id],
  inventory: (lowOnly) => ['admin', 'inventory', { lowOnly }],
  movements: ['admin', 'movements'],
  customers: ['admin', 'customers'],
  discounts: ['admin', 'discounts'],
  banners: ['admin', 'banners'],
  settings: ['admin', 'settings'],
  audit: ['admin', 'audit'],
  reviews: (status) => ['admin', 'reviews', { status }],
  messages: ['admin', 'messages'],
  subscribers: ['admin', 'subscribers'],
};

export function useAnalytics() {
  return useQuery({ queryKey: keys.analytics, queryFn: adminApi.analytics });
}

export function useProducts(params) {
  return useQuery({ queryKey: keys.products(params), queryFn: () => adminApi.listProducts(params) });
}

export function useProduct(id) {
  return useQuery({ queryKey: keys.product(id), queryFn: () => adminApi.getProduct(id), enabled: Boolean(id) });
}

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: adminApi.listCategories });
}

export function useOrders(params) {
  return useQuery({ queryKey: keys.orders(params), queryFn: () => adminApi.listOrders(params) });
}

export function useOrder(id) {
  return useQuery({ queryKey: keys.order(id), queryFn: () => adminApi.getOrder(id), enabled: Boolean(id) });
}

export function useInventory(lowOnly = false) {
  return useQuery({ queryKey: keys.inventory(lowOnly), queryFn: () => adminApi.listInventory({ lowOnly }) });
}

export function useMovements() {
  return useQuery({ queryKey: keys.movements, queryFn: adminApi.listMovements });
}

export function useCustomers() {
  return useQuery({ queryKey: keys.customers, queryFn: adminApi.listCustomers });
}

export function useDiscounts() {
  return useQuery({ queryKey: keys.discounts, queryFn: adminApi.listDiscounts });
}

export function useBanners() {
  return useQuery({ queryKey: keys.banners, queryFn: adminApi.listBanners });
}

export function useSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: adminApi.getSettings });
}

export function useAuditLogs() {
  return useQuery({ queryKey: keys.audit, queryFn: adminApi.listAuditLogs });
}

export function useReviews(status) {
  return useQuery({ queryKey: keys.reviews(status), queryFn: () => adminApi.listReviews(status) });
}

export function useMessages() {
  return useQuery({ queryKey: keys.messages, queryFn: adminApi.listMessages });
}

export function useSubscribers() {
  return useQuery({ queryKey: keys.subscribers, queryFn: adminApi.listSubscribers });
}

/** Generic mutation helper that invalidates the given query keys on success. */
export function useInvalidatingMutation(mutationFn, invalidateKeys) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
