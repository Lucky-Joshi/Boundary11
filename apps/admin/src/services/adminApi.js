import { api, API_URL, getAuthToken } from './api.js';

/** Fetch a CSV export with the staff token and trigger a browser download. */
export async function downloadExport(kind) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/admin/exports/${kind}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `boundary11-${kind}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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

  listReviews: (status) => api.get(`/admin/reviews${status ? `?status=${status}` : ''}`),
  setReviewStatus: (id, status) => api.patch(`/admin/reviews/${id}`, { status }),

  listMessages: () => api.get('/admin/messages'),
  setMessageStatus: (id, status) => api.patch(`/admin/messages/${id}`, { status }),

  listSubscribers: () => api.get('/admin/subscribers'),
};
