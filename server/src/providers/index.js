import { createDemoProvider } from './demoProvider.js';
import { createSupabaseProvider } from './supabaseProvider.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Provider selection.
 *
 * With Supabase credentials present (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * the API runs against a real Supabase project. Otherwise it falls back to the
 * in-memory demo provider so the platform runs with zero setup.
 *
 * Tests always use the demo provider so the suite never touches a network.
 */
let providerInstance = null;

/** Decide which provider to use for a given environment configuration. */
export function providerModeFor(environment = env) {
  return environment.nodeEnv !== 'test' && environment.supabase.configured ? 'supabase' : 'demo';
}

export function getProvider() {
  if (providerInstance) return providerInstance;

  providerInstance = providerModeFor() === 'supabase' ? createSupabaseProvider() : createDemoProvider();
  logger.info('Data provider initialised', { mode: providerInstance.mode });
  return providerInstance;
}

export function resetProviderForTests() {
  providerInstance = null;
}
