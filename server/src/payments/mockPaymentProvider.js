/**
 * Payment provider (payment gateway interface).
 *
 * Implements pure functions — create a checkout session, decide the outcome
 * of a confirmation, and verify a callback — with no network calls and no
 * money movement. The data provider is responsible for persisting the
 * resulting order state, so this layer can later be swapped for a real
 * gateway (Razorpay, Stripe, …) behind the same interface without touching
 * the checkout service or the order reports.
 */

export function createMockPaymentProvider() {
  return {
    mode: 'mock',

    /**
     * Return a fake "payment session" the client can show. In demo mode the
     * session is never routed anywhere; the client confirms via
     * POST /orders/payments/verify.
     */
    async createCheckoutSession({ order, method }) {
      return {
        provider: 'mock',
        method,
        sessionId: `mock_session_${order.id.slice(-6)}`,
        reference: null,
        amountPaise: order.totalPaise,
        status: 'requires_confirmation',
        message: 'DEMO payment session. No real money is charged.',
      };
    },

    /**
     * Decide the demo payment outcome. Returns a discriminated result the
     * checkout service applies to the order:
     *   { status: 'paid',   reference, message }
     *   { status: 'failed', message }
     *
     * `sessionId`/`reference` are accepted for forward-compat with real
     * gateways; the verify-payment flow uses the order id to derive a stable
     * reference.
     */
    async confirmPayment({ order, success }) {
      if (success) {
        return {
          status: 'paid',
          reference: `mock_pay_${order.id.slice(-6)}`,
          message: 'DEMO payment captured. This is not a real transaction.',
        };
      }
      return {
        status: 'failed',
        message: 'DEMO payment failed. No money was charged. You can retry from the order page.',
      };
    },

    /**
     * Verify a webhook signature / callback token. The mock accepts anything;
     * a real gateway would verify the cryptographic signature server-side.
     */
    async verifyCallback(_payload) {
      return { verified: true, provider: 'mock' };
    },
  };
}

// Kept for parity with real-gateway reference formats.
export const mockPaymentReference = (orderId) => `mock_pay_${orderId.slice(-6)}`;
export const mockSessionId = (orderId) => `mock_session_${orderId.slice(-6)}`;