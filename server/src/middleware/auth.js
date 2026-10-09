import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/token.js';
import { getProvider } from '../providers/index.js';

/**
 * Populates req.user when a valid bearer token is present.
 * The account is re-read from the provider so role changes and disabled
 * accounts take effect on the next request.
 */
export async function authenticate(req, _res, next) {
  req.user = null;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    if (payload?.sub) {
      const account = await getProvider().getAccountById(payload.sub);
      if (account && account.status === 'active') {
        req.user = {
          id: account.id,
          email: account.email,
          role: account.role,
          name: account.fullName,
        };
      }
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
