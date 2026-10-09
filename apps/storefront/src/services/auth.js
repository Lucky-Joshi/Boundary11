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
