import { ApiError } from '../utils/ApiError.js';
import { getAuthProvider } from '../auth/index.js';

/**
 * Populates req.user (and req.token) when a valid bearer token is present.
 * The auth provider re-reads the account so role changes and disabled
 * accounts take effect on the next request; expired/revoked sessions simply
 * fall through to unauthenticated (protected routes then return 401).
 */
export async function authenticate(req, _res, next) {
  req.user = null;
  req.token = null;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next();
  try {
    const result = await getAuthProvider().resolveSession(token);
    if (result?.user) {
      const { user } = result;
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.fullName,
        fullName: user.fullName,
        createdAt: user.createdAt,
      };
      req.token = token;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  return next();
}

export function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your account does not have permission to do that.'));
    }
    return next();
  };
}