import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

/** General API limiter. Disabled during tests to keep them deterministic. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 100000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
});

/** Stricter limiter for auth and checkout endpoints. */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 100000 : 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});
