import { createMockPaymentProvider } from './mockPaymentProvider.js';

/**
 * Payment provider selection. Only the mock gateway exists today; it is used
 * unconditionally so checkout, order status and reports stay fully functional
 * in every mode. A real gateway would be selected here from configuration.
 */
let paymentInstance = null;

export function getPaymentProvider() {
  if (!paymentInstance) paymentInstance = createMockPaymentProvider();
  return paymentInstance;
}

export function resetPaymentProviderForTests() {
  paymentInstance = null;
}