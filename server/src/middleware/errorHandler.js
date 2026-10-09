import { ApiError } from '../utils/ApiError.js';
import { isProd, isTest } from '../config/env.js';
import { logger } from '../config/logger.js';

/** 404 handler for unmatched routes. */
export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/** Central error handler. Never leaks stack traces in production. */
export function errorHandler(err, req, res, _next) {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message = isApiError ? err.message : 'Something went wrong.';

  if (!isApiError || status >= 500) {
    logger.error(err.message, { path: req.originalUrl, stack: isProd ? undefined : err.stack });
  }

  const body = {
    error: {
      code,
      message,
      ...(err.fields ? { fields: err.fields } : {}),
    },
  };

  if (!isProd && !isTest && !isApiError) {
    body.error.detail = err.message;
  }

  res.status(status).json(body);
}
