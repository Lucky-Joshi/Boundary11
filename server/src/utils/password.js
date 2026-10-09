import crypto from 'node:crypto';

/**
 * Password hashing for the demo/local auth provider.
 *
 * Uses scrypt with a per-password random salt. Even in prototype mode,
 * passwords are never stored in plain text — the local adapter persists only
 * the `scrypt$salt$hash` forms.
 *
 * Supabase mode delegates credential verification to Supabase Auth and never
 * calls these helpers.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const computed = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
}