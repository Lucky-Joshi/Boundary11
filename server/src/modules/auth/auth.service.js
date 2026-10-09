import { getAuthProvider } from '../../auth/index.js';
import { ApiError } from '../../utils/ApiError.js';

export async function login(body) {
  return getAuthProvider().login(body);
}

export async function register(input) {
  return getAuthProvider().register(input);
}

export async function logout(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const revoked = token ? await getAuthProvider().revokeSession(token) : false;
  return { revoked };
}

export async function me(req) {
  const account = await getAuthProvider().resolveSession(req.token);
  if (!account || !account.user) throw ApiError.unauthorized();
  return account.user;
}