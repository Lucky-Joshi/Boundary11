import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../src/utils/token.js';

describe('demo tokens', () => {
  it('round-trips a signed payload', () => {
    const token = signToken({ sub: 'user_1', role: 'admin' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('user_1');
    expect(payload.role).toBe('admin');
  });

  it('rejects a tampered token', () => {
    const token = signToken({ sub: 'user_1', role: 'admin' });
    const [data] = token.split('.');
    expect(verifyToken(`${data}.forgedsignature`)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(verifyToken('not-a-token')).toBeNull();
    expect(verifyToken(undefined)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signToken({ sub: 'user_1' }, -1);
    expect(verifyToken(token)).toBeNull();
  });
});
