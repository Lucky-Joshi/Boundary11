import { api, setAuthToken } from './api.js';

export async function login(email, password) {
  const result = await api.post('/auth/login', { email, password });
  setAuthToken(result.token);
  return result;
}

export async function register(payload) {
  const result = await api.post('/auth/register', payload);
  setAuthToken(result.token);
  return result;
}

export function fetchMe() {
  return api.get('/auth/me');
}

/**
 * Log out: revoke the token server-side (best effort) and always drop the
 * local in-memory token so the UI returns to signed-out state.
 */
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Even if the revoke call fails, the local token is still cleared below.
  }
  setAuthToken(null);
}
