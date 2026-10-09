import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';

/** Attaches a request id and logs completed requests with timing. */
export function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
      id: req.id,
      ms: Math.round(durationMs),
    });
  });
  next();
}
