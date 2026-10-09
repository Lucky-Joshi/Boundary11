import { createDemoProvider } from './demoProvider.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Provider selection.
 *
 * Milestone 1 ships the in-memory demo provider. When Supabase credentials are
 * present a real provider will be introduced here and selected automatically.
 * Until then the API stays in demo mode so the platform runs with zero setup.
 */
let providerInstance = null;

export function getProvider() {
  if (providerInstance) return providerInstance;

  if (env.supabase.configured) {
    logger.warn(
      'Supabase credentials detected, but the Supabase provider is not implemented in this milestone. ' +
        'Continuing with the demo provider. Set no Supabase vars to silence this warning.',
    );
  }

  providerInstance = createDemoProvider();
  logger.info('Data provider initialised', { mode: providerInstance.mode });
  return providerInstance;
}

export function resetProviderForTests() {
  providerInstance = null;
}
