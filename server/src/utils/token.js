import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * DEMO authentication tokens.
 *
 * These are HMAC-signed, tamper-evident tokens used only by the prototype's
 * mock auth. They are NOT a replacement for Supabase Auth / real JWTs and are
 * clearly marked as demo throughout.
 */
export function signToken(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const now = Date.now();
  const body = { ...payload, iat: now, exp: now + ttlSeconds * 1000 };
  const data = Buffer.from(JSON.stringify(body)).toString('base64url');
  const signature = crypto.createHmac('sha256', env.demoAuthSecret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = crypto.createHmac('sha256', env.demoAuthSecret).update(data).digest('base64url');
  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);
  if (provided.length !== computed.length || !crypto.timingSafeEqual(provided, computed)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
