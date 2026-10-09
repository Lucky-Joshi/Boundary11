/**
 * ApiError is the single error type thrown by services and expected by the
 * error-handling middleware. It carries an HTTP status and optional field map.
 */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(message, fields) {
    return new ApiError(400, 'BAD_REQUEST', message, fields);
  }

  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do that.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message, fields) {
    return new ApiError(409, 'CONFLICT', message, fields);
  }

  static unprocessable(message, fields) {
    return new ApiError(422, 'UNPROCESSABLE_ENTITY', message, fields);
  }

  static tooMany(message = 'Too many requests.') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
