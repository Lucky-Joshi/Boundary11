/**
 * Thin API client for the Boundary11 Express API.
 *
 * The auth token is held in module memory only and is deliberately NOT written
 * to localStorage, in line with the project's storage rules. Refreshing the
 * page therefore requires signing in again — production should use httpOnly
 * cookies issued by the server instead.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function getAuthToken() {
  return authToken;
}

export function getCartId() {
  let id = localStorage.getItem('b11_cart_id');
  if (!id) {
    id = `cart_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem('b11_cart_id', id);
  }
  return id;
}

export function resetCartId() {
  localStorage.removeItem('b11_cart_id');
}

async function request(path, { method = 'GET', body, cartId } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const cid = cartId ?? getCartId();
  if (cid) headers['x-cart-id'] = cid;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error(
      'Could not reach the Boundary11 API. Is the backend running on port 5000?',
    );
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data?.error?.code || 'ERROR';
    error.fields = data?.error?.fields;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export { API_URL };
