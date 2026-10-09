import { api } from './api.js';

export const adminApi = {
  analytics: () => api.get('/admin/analytics'),

  listProducts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.includeArchived) query.set('includeArchived', 'true');
    const suffix = query.toString() ? `?${query}` : '';
    return api.get(`/admin/products${suffix}`);
  },
  getProduct: (id) => api.get(`/admin/products/${id}`),
  createProduct: (body) => api.post('/admin/products', body),
  updateProduct: (id, body) => api.patch(`/admin/products/${id}`, body),
  setProductStatus: (id, status) => api.patch(`/admin/products/${id}/status`, { status }),
  archiveProduct: (id) => api.del(`/admin/products/${id}`),

  listCategories: () => api.get('/categories'),
  listCollections: () => api.get('/collections'),

  listOrders: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.q) query.set('q', params.q);
    const suffix = query.toString() ? `?${query}` : '';
    return api.get(`/admin/orders${suffix}`);
  },
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  setOrderStatus: (id, status, note) => api.patch(`/admin/orders/${id}/status`, { status, note }),

  listInventory: (params = {}) => {
    const suffix = params.lowOnly ? '?lowOnly=true' : '';
    return api.get(`/admin/inventory${suffix}`);
  },
  listMovements: () => api.get('/admin/inventory/movements'),
  adjustInventory: (body) => api.post('/admin/inventory/adjustments', body),

  listCustomers: () => api.get('/admin/customers'),

  listDiscounts: () => api.get('/admin/discounts'),
  createDiscount: (body) => api.post('/admin/discounts', body),

  listBanners: () => api.get('/admin/content/banners'),

  getSettings: () => api.get('/admin/settings'),
  listAuditLogs: () => api.get('/admin/audit-logs'),
  listStaff: () => api.get('/admin/staff'),
};
