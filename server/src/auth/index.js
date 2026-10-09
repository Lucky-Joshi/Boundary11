import { env } from '../config/env.js';
import { createDemoAuthProvider } from './demoAuthProvider.js';
import { createSupabaseAuthProvider } from './supabaseAuthProvider.js';

/**
 * Auth provider selection. Mirrors the data-provider rules: tests always use
 * the isolated demo auth provider; otherwise `AUTH_PROVIDER` (or 'auto')
 * picks Supabase Auth when credentials are configured, else demo auth.
 */
let authInstance = null;

export function authProviderModeFor(environment = env) {
  const requested = environment.authProvider || 'auto';
  if (environment.nodeEnv === 'test') return 'demo';
  if (requested === 'demo') return 'demo';
  if (requested === 'supabase') return environment.supabase?.configured ? 'supabase' : 'demo';
  return environment.supabase?.configured ? 'supabase' : 'demo';
}

export function getAuthProvider() {
  if (authInstance) return authInstance;
  authInstance =
    authProviderModeFor() === 'supabase'
      ? createSupabaseAuthProvider()
      : createDemoAuthProvider();
  return authInstance;
}

export function resetAuthProviderForTests() {
  authInstance = null;
}