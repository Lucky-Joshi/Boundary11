import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockPaymentProvider, mockPaymentReference, mockSessionId } from '../src/payments/mockPaymentProvider.js';
import { getPaymentProvider, resetPaymentProviderForTests } from '../src/payments/index.js';

describe('mock payment provider', () => {
  let provider;
  let sampleOrder;

  beforeEach(() => {
    provider = createMockPaymentProvider();
    // order.id.slice(-6) -> '567890'
    sampleOrder = { id: 'order_abcdef1234567890', totalPaise: 299900 };
  });

  it('createCheckoutSession returns a mock session with required fields', async () => {
    const session = await provider.createCheckoutSession({ order: sampleOrder, method: 'mock_upi' });
    expect(session.provider).toBe('mock');
    expect(session.method).toBe('mock_upi');
    expect(session.sessionId).toBe('mock_session_567890');
    expect(session.reference).toBeNull();
    expect(session.amountPaise).toBe(299900);
    expect(session.status).toBe('requires_confirmation');
    expect(session.message).toContain('DEMO');
  });

  it('confirmPayment with success=true returns paid status and a reference', async () => {
    const result = await provider.confirmPayment({ order: sampleOrder, success: true });
    expect(result.status).toBe('paid');
    expect(result.reference).toBe('mock_pay_567890');
    expect(result.message).toContain('captured');
  });

  it('confirmPayment with success=false returns failed status', async () => {
    const result = await provider.confirmPayment({ order: sampleOrder, success: false });
    expect(result.status).toBe('failed');
    expect(result.message).toContain('failed');
  });

  it('confirmPayment reference is deterministic for the same order', async () => {
    const r1 = await provider.confirmPayment({ order: sampleOrder, success: true });
    const r2 = await provider.confirmPayment({ order: sampleOrder, success: true });
    expect(r1.reference).toBe(r2.reference);
  });

  it('verifyCallback accepts any payload and returns verified=true', async () => {
    const result = await provider.verifyCallback({ anything: 'goes' });
    expect(result.verified).toBe(true);
    expect(result.provider).toBe('mock');
  });
});

describe('payment provider selection', () => {
  afterEach(() => {
    resetPaymentProviderForTests();
  });

  it('getPaymentProvider returns the mock provider by default', () => {
    const p = getPaymentProvider();
    expect(p.mode).toBe('mock');
    expect(typeof p.createCheckoutSession).toBe('function');
    expect(typeof p.confirmPayment).toBe('function');
    expect(typeof p.verifyCallback).toBe('function');
  });
});

describe('mock reference helpers', () => {
  it('mockSessionId and mockPaymentReference are deterministic', () => {
    expect(mockSessionId('order_xyz123')).toBe('mock_session_xyz123');
    expect(mockPaymentReference('order_xyz123')).toBe('mock_pay_xyz123');
  });
});