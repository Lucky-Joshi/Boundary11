import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateId(prefix = 'id') {
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${random}`;
}

export function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return `B11-${y}${m}${d}-${suffix}`;
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function nowISO() {
  return new Date().toISOString();
}
