import { createDemoProvider } from './demoProvider.js';
import { createLocalProvider } from './localProvider.js';
import { createSupabaseProvider } from './supabaseProvider.js';
import { env, validateEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Provider selection.
 *
 * `DATA_PROVIDER` controls the data layer explicitly ('auto' | 'local' |
 * 'supabase' | 'demo'). With 'auto' (the default), Supabase is used when
 * `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are configured, and the
 * durable local adapter is used otherwise.
 *
 * The test suite always uses the in-memory demo provider unless a test
 * explicitly requests 'local', so tests never touch disk or a network.
 */
let providerInstance = null;

/** Decide which provider to use for a given environment configuration. */
export function providerModeFor(environment = env) {
  const requested = environment.dataProvider || 'auto';

  if (environment.nodeEnv === 'test') {
    // Never touch Supabase or (by default) disk while running tests.
    return requested === 'local' ? 'local' : 'demo';
  }

  if (requested === 'demo') return 'demo';
  if (requested === 'local') return 'local';
  if (requested === 'supabase') return environment.supabase?.configured ? 'supabase' : 'local';
  // auto
  return environment.supabase?.configured ? 'supabase' : 'local';
}

function buildProvider() {
  const mode = providerModeFor();
  switch (mode) {
    case 'supabase':
      return createSupabaseProvider();
    case 'local':
      return createLocalProvider();
    default:
      return createDemoProvider();
  }
}

export function getProvider() {
  if (providerInstance) return providerInstance;

  const { errors, warnings } = validateEnv();
  for (const error of errors) {
    logger.error(`CONFIG ERROR: ${error}`);
  }
  for (const warning of warnings) {
    logger.warn(`CONFIG WARNING: ${warning}`);
  }
  if (errors.length) {
    logger.warn('Starting anyway in a degraded mode so local development keeps working.');
  }

  providerInstance = buildProvider();
  if (providerInstance.mode === 'supabase') {
    logger.info('Data provider initialised', { mode: 'supabase' });
  } else {
    logger.warn(
      'Data provider initialised in LOCAL DEMO mode — no Supabase connected.',
      { mode: providerInstance.mode, persistent: providerInstance.mode === 'local' },
    );
  }
  return providerInstance;
}

export function resetProviderForTests() {
  providerInstance = null;
}