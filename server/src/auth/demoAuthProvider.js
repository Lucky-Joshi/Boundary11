import { getProvider } from '../providers/index.js';
import { signToken, decodeToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** In-memory revoked-token registry (lost on restart; fine for demo auth). */
const revokedTokens = new Map();

function prune() {
  const now = Date.now();
  for (const [token, expiresAt] of revokedTokens) {
    if (expiresAt <= now) revokedTokens.delete(token);
  }
}

export function publicUser(account) {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    createdAt: account.createdAt,
  };
}

export function createDemoAuthProvider() {
  return {
    mode: 'demo',

    async login({ email, password }) {
      const result = await getProvider().authenticate(email, password);
      if (!result) throw ApiError.unauthorized('Incorrect email or password.');
      if (result.disabled) throw ApiError.forbidden('This account has been disabled.');
      const account = result.account;
      const token = signToken({ sub: account.id, role: account.role }, SESSION_TTL_MS / 1000);
      return {
        token,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        user: publicUser(account),
      };
    },

    async register(input) {
      const account = await getProvider().register(input);
      const token = signToken({ sub: account.id, role: account.role }, SESSION_TTL_MS / 1000);
      return {
        token,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        user: publicUser(account),
      };
    },

    /**
     * Resolve a session token to a user, or an error classification:
     * 'invalid' (bad signature/shape), 'expired', 'revoked' or 'disabled'.
     */
    async resolveSession(token) {
      if (!token) return { error: 'invalid' };
      prune();
      if (revokedTokens.has(token)) return { error: 'revoked' };
      const parsed = decodeToken(token);
      if (!parsed) return { error: 'invalid' };
      if (parsed.expired) return { error: 'expired' };
      const account = await getProvider().getAccountById(parsed.payload.sub);
      if (!account) return { error: 'invalid' };
      if (account.status !== 'active') return { error: 'disabled' };
      return { user: publicUser(account) };
    },

    async revokeSession(token) {
      prune();
      if (!token) return false;
      const parsed = decodeToken(token);
      const expiresAt = parsed?.payload?.exp ? parsed.payload.exp : Date.now() + SESSION_TTL_MS;
      revokedTokens.set(token, expiresAt);
      return true;
    },
  };
}