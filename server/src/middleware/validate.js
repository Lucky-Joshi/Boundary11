import { ApiError } from '../utils/ApiError.js';
import { formatZodError } from '@boundary11/shared';

/**
 * Validate request input with Zod schemas.
 * Assigns parsed (and coerced) values back onto the request.
 *
 * Usage: router.post('/', validate({ body: checkoutSchema }), handler)
 */
export function validate(schemas) {
  return function validateMiddleware(req, _res, next) {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      if (error?.issues) {
        next(ApiError.badRequest('Please correct the highlighted fields.', formatZodError(error)));
      } else {
        next(error);
      }
    }
  };
}
